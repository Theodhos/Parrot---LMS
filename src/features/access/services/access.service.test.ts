import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EmailStatus, EnrollmentStatus, PaymentStatus, Role } from "@/generated/prisma";
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import { handleCoursePurchase, handleCourseRefund, requireCourseAccess } from "./access.service";
import type { CoursePurchase } from "@/features/access/schemas/access.schema";

describe("access.service purchase/refund flow (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const buyerEmail = `ghl-buyer-${stamp}@test.local`;
  const courseSlug = `ghl-course-${stamp}`;
  const txn = `txn-${stamp}`;
  const headers = new Headers({ host: "lms.test.local" });

  let instructorId: string;
  let courseId: string;
  const savedGhlToken = process.env.GHL_API_TOKEN;

  const purchase = (overrides: Partial<CoursePurchase> = {}): CoursePurchase => ({
    email: buyerEmail,
    name: "Ghl Buyer",
    courseSlugs: [courseSlug],
    transactionId: txn,
    paymentStatus: "succeeded",
    ...overrides,
  });

  beforeAll(async () => {
    // No real GoHighLevel calls from tests: force the credentials handoff
    // (contact fields + trigger tag) to fail and be logged.
    delete process.env.GHL_API_TOKEN;

    const instructor = await prisma.user.create({
      data: { name: "Instructor", email: `ghl-instructor-${stamp}@test.local`, role: Role.INSTRUCTOR },
    });
    instructorId = instructor.id;
    const course = await prisma.course.create({
      data: {
        title: "GHL Test Course",
        slug: courseSlug,
        description: "test",
        instructorId,
        status: CourseStatus.PUBLISHED,
        priceCents: 4999,
      },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    if (savedGhlToken !== undefined) process.env.GHL_API_TOKEN = savedGhlToken;
    const buyer = await prisma.user.findUnique({ where: { email: buyerEmail }, select: { id: true } });
    if (buyer) {
      await prisma.emailLog.deleteMany({ where: { userId: buyer.id } });
      await prisma.payment.deleteMany({ where: { userId: buyer.id } });
      // Buyer first: cascades their activity/enrollments, which would
      // otherwise block deleting the course (required relation, NoAction)...
      await prisma.user.delete({ where: { id: buyer.id } });
    }
    // ...and the course before the instructor, whom it requires.
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: instructorId } });
  });

  it("rejects a non-successful payment status and provisions nothing", async () => {
    for (const paymentStatus of ["failed", "pending"]) {
      await expect(
        handleCoursePurchase(purchase({ paymentStatus, transactionId: `${txn}-${paymentStatus}` }), headers),
      ).rejects.toBeInstanceOf(ValidationError);
    }
    expect(await prisma.user.findUnique({ where: { email: buyerEmail } })).toBeNull();
  });

  it("provisions account + lifetime access + payment record from a successful payment", async () => {
    const result = await handleCoursePurchase(purchase(), headers);

    expect(result.newAccount).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.enrolledCourseSlugs).toEqual([courseSlug]);

    const user = await prisma.user.findUnique({ where: { email: buyerEmail } });
    expect(user).not.toBeNull();
    expect(user!.username).toBeTruthy();
    // Stored hashed, never plaintext.
    expect(user!.password).toMatch(/^\$2[aby]\$/);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user!.id, courseId } },
    });
    expect(enrollment?.status).toBe(EnrollmentStatus.ACTIVE);

    const payment = await prisma.payment.findUnique({ where: { ghlTransactionId: txn } });
    expect(payment?.status).toBe(PaymentStatus.SUCCEEDED);
    expect(payment?.issuedCredentials).toBe(true);

    // The credentials handoff to GHL was logged; with no GHL_API_TOKEN it
    // fails WITHOUT breaking provisioning -- account and access stay valid.
    expect(result.emailStatus).toBe(EmailStatus.FAILED);
    const log = await prisma.emailLog.findFirst({ where: { paymentId: payment!.id } });
    expect(log?.status).toBe(EmailStatus.FAILED);

    await expect(
      requireCourseAccess({ id: user!.id, role: Role.STUDENT } as never, { id: courseId, instructorId }),
    ).resolves.toBeUndefined();
  });

  it("treats a redelivered webhook as a no-op (no duplicates) and retries the failed email", async () => {
    const before = await prisma.user.findUnique({ where: { email: buyerEmail } });
    const result = await handleCoursePurchase(purchase(), headers);

    expect(result.duplicate).toBe(true);
    expect(await prisma.user.count({ where: { email: buyerEmail } })).toBe(1);
    expect(await prisma.payment.count({ where: { ghlTransactionId: txn } })).toBe(1);
    expect(await prisma.enrollment.count({ where: { userId: before!.id, courseId } })).toBe(1);

    // The credentials were never handed to GHL, so the retry rotated the
    // password (plaintext is never stored here, the original cannot be re-pushed).
    const after = await prisma.user.findUnique({ where: { email: buyerEmail } });
    expect(after!.password).not.toBe(before!.password);
  });

  it("denies course access to an account with no enrollment (403)", async () => {
    const stranger = await prisma.user.create({
      data: { name: "Stranger", email: `ghl-stranger-${stamp}@test.local`, role: Role.STUDENT },
    });
    try {
      await expect(
        requireCourseAccess({ id: stranger.id, role: Role.STUDENT } as never, { id: courseId, instructorId }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    } finally {
      await prisma.user.delete({ where: { id: stranger.id } });
    }
  });

  it("revokes access on refund, keeps the account, and a re-purchase restores access", async () => {
    const user = await prisma.user.findUnique({ where: { email: buyerEmail } });

    const refund = await handleCourseRefund({ transactionId: txn, courseSlugs: [] });
    expect(refund.revokedCourseSlugs).toEqual([courseSlug]);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user!.id, courseId } },
    });
    expect(enrollment?.status).toBe(EnrollmentStatus.REVOKED);
    expect((await prisma.payment.findUnique({ where: { ghlTransactionId: txn } }))?.status).toBe(
      PaymentStatus.REFUNDED,
    );
    await expect(
      requireCourseAccess({ id: user!.id, role: Role.STUDENT } as never, { id: courseId, instructorId }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // Buying again (new transaction) re-activates the same enrollment row and
    // keeps the existing credentials (no new account, password untouched).
    const result = await handleCoursePurchase(purchase({ transactionId: `${txn}-repurchase` }), headers);
    expect(result.newAccount).toBe(false);
    const restored = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user!.id, courseId } },
    });
    expect(restored?.status).toBe(EnrollmentStatus.ACTIVE);
    expect((await prisma.user.findUnique({ where: { email: buyerEmail } }))!.password).toBe(user!.password);
  });
});
