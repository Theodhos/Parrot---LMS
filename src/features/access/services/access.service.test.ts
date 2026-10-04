import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EmailStatus, EnrollmentStatus, PaymentStatus, Role } from "@/generated/prisma";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import { handleCoursePurchase, handleCourseRefund, requireCourseAccess } from "./access.service";
import { scopeCourseQueriesTo } from "./purchase-test-support";
import { activateAccountFromToken } from "@/features/auth/services/activation.service";
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
  const lateBuyerEmail = `ghl-late-buyer-${stamp}@test.local`;
  const instructorEmail = `ghl-instructor-${stamp}@test.local`;
  const courseSlug = `ghl-course-${stamp}`;
  const txn = `txn-${stamp}`;
  const lateTxn = `txn-late-${stamp}`;
  const username = `buyer-${stamp}`;
  const headers = new Headers({ host: "lms.test.local" });

  let instructorId: string;
  let courseId: string;
  let setupToken: string;
  let courseScope: ReturnType<typeof scopeCourseQueriesTo>;
  const savedGhlToken = process.env.GHL_API_TOKEN;

  // Stand-in for the GoHighLevel API: records every call, never leaves the process.
  const ghlCalls: GhlCall[] = [];
  let ghlDown = false;

  const purchase = (overrides: Partial<CoursePurchase> = {}): CoursePurchase => ({
    email: buyerEmail,
    name: "Ghl Buyer",
    transactionId: txn,
    paymentStatus: "succeeded",
    contactId: "contact-123",
    ...overrides,
  });

  const linkSentToGhl = () =>
    ghlCalls.flatMap((c) => c.body.customFields ?? []).find((f) => f.key === "course_login_url")?.field_value;
  const tagsSentToGhl = () => ghlCalls.flatMap((c) => c.body.tags ?? []);
  const student = (id: string) => ({ id, role: Role.STUDENT }) as never;

  beforeAll(async () => {
    process.env.GHL_API_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init: RequestInit) => {
        ghlCalls.push({ url: String(url), method: init.method!, body: JSON.parse(String(init.body)) });
        if (ghlDown) return new Response("upstream unavailable", { status: 503 });
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
    ghlDown = false;
  });

  afterAll(async () => {
    courseScope.restore();
    vi.unstubAllGlobals();
    if (savedGhlToken === undefined) delete process.env.GHL_API_TOKEN;
    else process.env.GHL_API_TOKEN = savedGhlToken;

    const buyers = await prisma.user.findMany({
      where: { email: { in: [buyerEmail, lateBuyerEmail] } },
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

  it("provisions the account and access, and hands GoHighLevel a setup link instead of a password", async () => {
    const result = await handleCoursePurchase(purchase(), headers);

    expect(result).toMatchObject({ newAccount: true, duplicate: false, emailStatus: EmailStatus.SENT });
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

    // Field first, then the tag that fires the email workflow -- and the only
    // field written is the link.
    expect(ghlCalls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual([
      "PUT /contacts/contact-123",
      "POST /contacts/contact-123/tags",
    ]);
    expect(ghlCalls[0]!.body.customFields!.map((f) => f.key)).toEqual(["course_login_url"]);
    expect(tagsSentToGhl()).toEqual(["course-credentials-ready"]);

    const link = linkSentToGhl()!;
    expect(link).toMatch(/^https:\/\/lms\.test\.local\/activate\?token=[0-9a-f]{64}$/);
    setupToken = new URL(link).searchParams.get("token")!;
  });

  it("treats a redelivered webhook as a no-op: no duplicates, no second link, no second email", async () => {
    const result = await handleCoursePurchase(purchase(), headers);
    const user = await prisma.user.findUnique({ where: { email: buyerEmail } });

    expect(result).toMatchObject({ duplicate: true, emailStatus: EmailStatus.SENT });
    expect(await prisma.user.count({ where: { email: buyerEmail } })).toBe(1);
    expect(await prisma.payment.count({ where: { ghlTransactionId: txn } })).toBe(1);
    expect(await prisma.enrollment.count({ where: { userId: user!.id, courseId } })).toBe(1);
    expect(await prisma.passwordSetupToken.count({ where: { userId: user!.id } })).toBe(1);
    expect(ghlCalls).toHaveLength(0);
  });

  it("lets the buyer choose their own username and password through the link, then log in with them", async () => {
    await activateAccountFromToken(setupToken, username, "MyOwnPass123");

    const user = await prisma.user.findUnique({ where: { email: buyerEmail } });
    expect(user!.username).toBe(username);
    expect(user!.password).toMatch(/^\$2[aby]\$/);

    expect((await verifyCredentials(username, "MyOwnPass123")).email).toBe(buyerEmail);
    await expect(verifyCredentials(username, "WrongPass123")).rejects.toBeInstanceOf(UnauthorizedError);
    // Single use: the link cannot set the credentials a second time.
    await expect(activateAccountFromToken(setupToken, username, "Another123")).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(requireCourseAccess(student(user!.id), { id: courseId, instructorId })).resolves.toBeUndefined();
  });

  it("keeps the account and access when GoHighLevel is down, and retries on redelivery", async () => {
    ghlDown = true;
    const late = purchase({ email: lateBuyerEmail, transactionId: lateTxn, contactId: "contact-late" });
    const failed = await handleCoursePurchase(late, headers);

    expect(failed.emailStatus).toBe(EmailStatus.FAILED);
    const user = await prisma.user.findUnique({ where: { email: lateBuyerEmail } });
    await expect(requireCourseAccess(student(user!.id), { id: courseId, instructorId })).resolves.toBeUndefined();

    ghlDown = false;
    ghlCalls.length = 0;
    const retried = await handleCoursePurchase(late, headers);

    expect(retried).toMatchObject({ duplicate: true, emailStatus: EmailStatus.SENT });
    expect(tagsSentToGhl()).toEqual(["course-credentials-ready"]);
    expect(await prisma.payment.count({ where: { ghlTransactionId: lateTxn } })).toBe(1);
  });

  it("issues a fresh link on redelivery once every earlier link has expired unused", async () => {
    const user = await prisma.user.findUnique({ where: { email: lateBuyerEmail } });
    const late = purchase({ email: lateBuyerEmail, transactionId: lateTxn, contactId: "contact-late" });

    await handleCoursePurchase(late, headers);
    expect(ghlCalls).toHaveLength(0);

    await prisma.passwordSetupToken.updateMany({
      where: { userId: user!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const result = await handleCoursePurchase(late, headers);

    expect(result.emailStatus).toBe(EmailStatus.SENT);
    expect(tagsSentToGhl()).toEqual(["course-credentials-ready"]);
    const freshToken = new URL(linkSentToGhl()!).searchParams.get("token")!;
    const row = await prisma.passwordSetupToken.findUnique({ where: { token: freshToken } });
    expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now());
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

    // Buying again (new transaction) re-activates the same enrollment row. The
    // account already has a password, so GHL gets the login page, not a setup link.
    const result = await handleCoursePurchase(purchase({ transactionId: `${txn}-repurchase` }), headers);
    expect(result.newAccount).toBe(false);
    const restored = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user!.id, courseId } },
    });
    expect(restored?.status).toBe(EnrollmentStatus.ACTIVE);
    expect(linkSentToGhl()).toBe("https://lms.test.local/login");
    expect(tagsSentToGhl()).toEqual(["course-access-granted"]);
    expect((await prisma.user.findUnique({ where: { email: buyerEmail } }))!.password).toBe(user!.password);
  });
});
