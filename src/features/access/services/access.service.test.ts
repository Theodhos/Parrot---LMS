import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EnrollmentStatus, PaymentStatus, Role } from "@/generated/prisma";
import { ConflictError, ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import { handleCoursePurchase, handleCourseRefund, requireCourseAccess } from "./access.service";
import { scopeCourseQueriesTo } from "./purchase-test-support";
import { claimAccountAfterCheckout } from "@/features/auth/services/activation.service";
import { verifyCredentials } from "@/features/auth/services/auth.service";
import type { CoursePurchase } from "@/features/access/schemas/access.schema";

interface GhlCall {
  url: string;
  method: string;
  body: { customFields?: { key: string; field_value: string }[]; tags?: string[] };
}

describe("access.service purchase/refund flow (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const buyerEmail = `ghl-buyer-${stamp}@test.local`;
  const instructorEmail = `ghl-instructor-${stamp}@test.local`;
  const courseSlug = `ghl-course-${stamp}`;
  const txn = `txn-${stamp}`;
  const username = `buyer-${stamp}`;
  const headers = new Headers({ host: "lms.test.local" });

  let instructorId: string;
  let courseId: string;
  let courseScope: ReturnType<typeof scopeCourseQueriesTo>;
  const savedGhlToken = process.env.GHL_API_TOKEN;

  // Stand-in for the GoHighLevel API: records every call, never leaves the
  // process. A purchase must never reach it -- that is what keeps a purchase
  // from setting off any email.
  const ghlCalls: GhlCall[] = [];

  const purchase = (overrides: Partial<CoursePurchase> = {}): CoursePurchase => ({
    email: buyerEmail,
    name: "Ghl Buyer",
    transactionId: txn,
    paymentStatus: "succeeded",
    contactId: "contact-123",
    ...overrides,
  });

  const student = (id: string) => ({ id, role: Role.STUDENT }) as never;

  beforeAll(async () => {
    process.env.GHL_API_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init: RequestInit) => {
        ghlCalls.push({ url: String(url), method: init.method!, body: JSON.parse(String(init.body)) });
        return Response.json({ contact: { id: "contact-123" } });
      }),
    );

    const instructor = await prisma.user.create({
      data: { name: "Instructor", email: instructorEmail, role: Role.INSTRUCTOR },
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
    courseScope = scopeCourseQueriesTo(() => [courseId]);
  });

  beforeEach(() => {
    ghlCalls.length = 0;
  });

  afterAll(async () => {
    courseScope.restore();
    vi.unstubAllGlobals();
    if (savedGhlToken === undefined) delete process.env.GHL_API_TOKEN;
    else process.env.GHL_API_TOKEN = savedGhlToken;

    const buyers = await prisma.user.findMany({
      where: { email: buyerEmail },
      select: { id: true },
    });
    const buyerIds = buyers.map((b) => b.id);
    await prisma.emailLog.deleteMany({ where: { userId: { in: buyerIds } } });
    await prisma.payment.deleteMany({ where: { userId: { in: buyerIds } } });
    // Buyers first: cascades their activity/enrollments, which would
    // otherwise block deleting the course (required relation, NoAction)...
    await prisma.user.deleteMany({ where: { id: { in: buyerIds } } });
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
    expect(ghlCalls).toHaveLength(0);
  });

  it("provisions the account and access without touching GoHighLevel, so no email can go out", async () => {
    const result = await handleCoursePurchase(purchase(), headers);

    expect(result).toMatchObject({ newAccount: true, duplicate: false });
    expect(result.enrolledCourseSlugs).toEqual([courseSlug]);

    // The account exists but cannot be logged into until the buyer sets it up.
    const user = await prisma.user.findUnique({ where: { email: buyerEmail } });
    expect(user).toMatchObject({ username: null, password: null });
    await expect(verifyCredentials(buyerEmail, "anything")).rejects.toBeInstanceOf(UnauthorizedError);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user!.id, courseId } },
    });
    expect(enrollment?.status).toBe(EnrollmentStatus.ACTIVE);
    const payment = await prisma.payment.findUnique({ where: { ghlTransactionId: txn } });
    expect(payment).toMatchObject({ status: PaymentStatus.SUCCEEDED, issuedCredentials: true, courseSlugs: ["*"] });

    // Nothing reaches the buyer's GoHighLevel contact -- no field, no tag --
    // so no workflow there can email them, and no setup link is minted.
    expect(ghlCalls).toHaveLength(0);
    expect(await prisma.emailLog.count({ where: { userId: user!.id } })).toBe(0);
    expect(await prisma.passwordSetupToken.count({ where: { userId: user!.id } })).toBe(0);
  });

  it("treats a redelivered webhook as a no-op: no duplicates, and still no email", async () => {
    const result = await handleCoursePurchase(purchase(), headers);
    const user = await prisma.user.findUnique({ where: { email: buyerEmail } });

    expect(result).toMatchObject({ duplicate: true });
    expect(await prisma.user.count({ where: { email: buyerEmail } })).toBe(1);
    expect(await prisma.payment.count({ where: { ghlTransactionId: txn } })).toBe(1);
    expect(await prisma.enrollment.count({ where: { userId: user!.id, courseId } })).toBe(1);
    expect(ghlCalls).toHaveLength(0);
    expect(await prisma.emailLog.count({ where: { userId: user!.id } })).toBe(0);
  });

  it("lets the buyer choose their own username and password with their checkout email, then log in with them", async () => {
    await claimAccountAfterCheckout(buyerEmail, username, "MyOwnPass123");

    const user = await prisma.user.findUnique({ where: { email: buyerEmail } });
    expect(user!.username).toBe(username);
    expect(user!.password).toMatch(/^\$2[aby]\$/);

    expect((await verifyCredentials(username, "MyOwnPass123")).email).toBe(buyerEmail);
    await expect(verifyCredentials(username, "WrongPass123")).rejects.toBeInstanceOf(UnauthorizedError);
    // Once only: the credentials cannot be set a second time.
    await expect(claimAccountAfterCheckout(buyerEmail, username, "Another123")).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(requireCourseAccess(student(user!.id), { id: courseId, instructorId })).resolves.toBeUndefined();
  });

  it("denies course access to an account that never purchased (403)", async () => {
    const stranger = await prisma.user.create({
      data: { name: "Stranger", email: `ghl-stranger-${stamp}@test.local`, role: Role.STUDENT },
    });
    try {
      await expect(
        requireCourseAccess(student(stranger.id), { id: courseId, instructorId }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    } finally {
      await prisma.user.delete({ where: { id: stranger.id } });
    }
  });

  it("revokes access on refund, keeps the account, and a re-purchase restores access with the same credentials", async () => {
    const user = await prisma.user.findUnique({ where: { email: buyerEmail } });

    const refund = await handleCourseRefund({ transactionId: txn });
    expect(refund.revokedCourseSlugs).toEqual([courseSlug]);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user!.id, courseId } },
    });
    expect(enrollment?.status).toBe(EnrollmentStatus.REVOKED);
    expect((await prisma.payment.findUnique({ where: { ghlTransactionId: txn } }))?.status).toBe(
      PaymentStatus.REFUNDED,
    );
    await expect(
      requireCourseAccess(student(user!.id), { id: courseId, instructorId }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    // The account itself survives the refund.
    expect((await verifyCredentials(username, "MyOwnPass123")).email).toBe(buyerEmail);

    // Buying again (new transaction) re-activates the same enrollment row and
    // keeps the login as it is -- again without a word to GoHighLevel.
    const result = await handleCoursePurchase(purchase({ transactionId: `${txn}-repurchase` }), headers);
    expect(result.newAccount).toBe(false);
    const restored = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user!.id, courseId } },
    });
    expect(restored?.status).toBe(EnrollmentStatus.ACTIVE);
    expect(ghlCalls).toHaveLength(0);
    expect((await prisma.user.findUnique({ where: { email: buyerEmail } }))!.password).toBe(user!.password);
  });
});
