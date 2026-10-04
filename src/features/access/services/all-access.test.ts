import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EnrollmentStatus, Role } from "@/generated/prisma";
import { ForbiddenError } from "@/lib/errors/app-error";
import { enrollInCourse } from "@/features/enrollments/services/enrollment.service";
import { getAccessibleEnrollment, handleCoursePurchase, handleCourseRefund, requireCourseAccess } from "./access.service";
import { hasAllCourseAccess } from "./all-access";
import { scopeCourseQueriesTo } from "./purchase-test-support";

/** One purchase opens the whole platform: nothing is left to buy inside it. */
describe("a buyer has every published course (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const buyerEmail = `all-buyer-${stamp}@test.local`;
  const legacyBuyerEmail = `all-legacy-buyer-${stamp}@test.local`;
  const outsiderEmail = `all-outsider-${stamp}@test.local`;
  const txn = `txn-all-${stamp}`;
  const secondTxn = `txn-all-second-${stamp}`;
  const headers = new Headers({ host: "lms.test.local" });
  const savedGhlToken = process.env.GHL_API_TOKEN;

  let instructorId: string;
  let outsiderId: string;
  let courseScope: ReturnType<typeof scopeCourseQueriesTo>;
  const courseIds: string[] = [];

  const createCourse = async (label: string, priceCents: number) => {
    const course = await prisma.course.create({
      data: {
        title: `All Access ${label}`,
        slug: `all-access-${label}-${stamp}`,
        description: "test",
        instructorId,
        status: CourseStatus.PUBLISHED,
        priceCents,
      },
    });
    courseIds.push(course.id);
    return course;
  };
  const student = (id: string) => ({ id, role: Role.STUDENT }) as never;
  const idOf = async (email: string) => (await prisma.user.findUnique({ where: { email } }))!.id;
  const buy = (transactionId: string) =>
    handleCoursePurchase({ email: buyerEmail, name: "All Buyer", transactionId, contactId: "contact-all" }, headers);

  let paidCourse: Awaited<ReturnType<typeof createCourse>>;
  let freeCourse: Awaited<ReturnType<typeof createCourse>>;

  beforeAll(async () => {
    // No real GoHighLevel calls from tests.
    process.env.GHL_API_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ contact: { id: "contact-all" } })));
    courseScope = scopeCourseQueriesTo(() => courseIds);

    const instructor = await prisma.user.create({
      data: { name: "Instructor", email: `all-instructor-${stamp}@test.local`, role: Role.INSTRUCTOR },
    });
    instructorId = instructor.id;
    const outsider = await prisma.user.create({ data: { name: "Outsider", email: outsiderEmail } });
    outsiderId = outsider.id;
    paidCourse = await createCourse("paid", 4900);
    freeCourse = await createCourse("free", 0);
  });

  afterAll(async () => {
    courseScope.restore();
    vi.unstubAllGlobals();
    if (savedGhlToken === undefined) delete process.env.GHL_API_TOKEN;
    else process.env.GHL_API_TOKEN = savedGhlToken;

    const students = await prisma.user.findMany({
      where: { email: { in: [buyerEmail, legacyBuyerEmail, outsiderEmail] } },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    await prisma.emailLog.deleteMany({ where: { userId: { in: studentIds } } });
    await prisma.payment.deleteMany({ where: { userId: { in: studentIds } } });
    // Students first (cascades their enrollments/activity), then the courses,
    // then the instructor the courses required.
    await prisma.user.deleteMany({ where: { id: { in: studentIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.user.deleteMany({ where: { id: instructorId } });
  });

  it("refuses a paid course to someone who never purchased, but allows a free one", async () => {
    expect(await hasAllCourseAccess(outsiderId)).toBe(false);
    await expect(enrollInCourse(student(outsiderId), paidCourse.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await getAccessibleEnrollment({ id: outsiderId }, paidCourse.id)).toBeNull();

    const free = await enrollInCourse(student(outsiderId), freeCourse.id);
    expect(free.status).toBe(EnrollmentStatus.ACTIVE);
  });

  it("enrolls a buyer in every published course, whatever product they paid for", async () => {
    const result = await buy(txn);
    const userId = await idOf(buyerEmail);

    // The purchase asked for every published course, with no slug filter.
    expect(courseScope.asked[0]!.where).toEqual({ status: CourseStatus.PUBLISHED });
    expect(result.enrolledCourseSlugs).toEqual(expect.arrayContaining([paidCourse.slug, freeCourse.slug]));
    expect(await hasAllCourseAccess(userId)).toBe(true);
    for (const course of [paidCourse, freeCourse]) {
      expect((await getAccessibleEnrollment({ id: userId }, course.id))?.status).toBe(EnrollmentStatus.ACTIVE);
    }
  }, 30_000);

  it("opens a course published after the purchase on first visit", async () => {
    const userId = await idOf(buyerEmail);
    const later = await createCourse("later", 9900);
    expect(await prisma.enrollment.count({ where: { userId, courseId: later.id } })).toBe(0);

    const enrollment = await getAccessibleEnrollment({ id: userId }, later.id);

    expect(enrollment?.status).toBe(EnrollmentStatus.ACTIVE);
    await expect(requireCourseAccess(student(userId), { id: later.id, instructorId })).resolves.toBeUndefined();
  });

  it("gives the same access to a buyer whose payment predates this rule and named a single course", async () => {
    const legacy = await prisma.user.create({ data: { name: "Legacy Buyer", email: legacyBuyerEmail } });
    await prisma.payment.create({
      data: { userId: legacy.id, ghlTransactionId: `txn-legacy-${stamp}`, courseSlugs: ["video-course"] },
    });

    expect(await hasAllCourseAccess(legacy.id)).toBe(true);
    expect((await getAccessibleEnrollment({ id: legacy.id }, paidCourse.id))?.status).toBe(EnrollmentStatus.ACTIVE);
    expect((await enrollInCourse(student(legacy.id), paidCourse.id)).status).toBe(EnrollmentStatus.ACTIVE);
  });

  it("keeps everything open after a refund while the buyer still holds another purchase", async () => {
    await buy(secondTxn);
    const userId = await idOf(buyerEmail);

    const refund = await handleCourseRefund({ transactionId: secondTxn });

    expect(refund.revokedCourseSlugs).toEqual([]);
    expect(await hasAllCourseAccess(userId)).toBe(true);
    expect((await getAccessibleEnrollment({ id: userId }, paidCourse.id))?.status).toBe(EnrollmentStatus.ACTIVE);
  }, 30_000);

  it("closes every paid course once the last purchase is refunded, and stops opening new ones", async () => {
    const userId = await idOf(buyerEmail);

    const refund = await handleCourseRefund({ transactionId: txn });

    expect(refund.revokedCourseSlugs).toContain(paidCourse.slug);
    expect(refund.revokedCourseSlugs).not.toContain(freeCourse.slug);
    expect(await hasAllCourseAccess(userId)).toBe(false);
    expect(await getAccessibleEnrollment({ id: userId }, paidCourse.id)).toBeNull();
    await expect(
      requireCourseAccess(student(userId), { id: paidCourse.id, instructorId }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    // Free courses were never behind the purchase.
    expect((await getAccessibleEnrollment({ id: userId }, freeCourse.id))?.status).toBe(EnrollmentStatus.ACTIVE);

    const afterRefund = await createCourse("after-refund", 9900);
    expect(await getAccessibleEnrollment({ id: userId }, afterRefund.id)).toBeNull();
    await expect(enrollInCourse(student(userId), afterRefund.id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
