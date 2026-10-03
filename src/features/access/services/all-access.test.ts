import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EnrollmentStatus, Role } from "@/generated/prisma";
import { ForbiddenError } from "@/lib/errors/app-error";
import { ALL_COURSES, toCoursePurchase } from "@/features/access/schemas/access.schema";
import { enrollInCourse } from "@/features/enrollments/services/enrollment.service";
import { getAccessibleEnrollment, handleCoursePurchase, handleCourseRefund, requireCourseAccess } from "./access.service";
import { hasAllCourseAccess } from "./all-access";

describe("all-courses purchase (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const buyerEmail = `all-buyer-${stamp}@test.local`;
  const outsiderEmail = `all-outsider-${stamp}@test.local`;
  const txn = `txn-all-${stamp}`;
  const headers = new Headers({ host: "lms.test.local" });
  const savedGhlToken = process.env.GHL_API_TOKEN;

  let instructorId: string;
  let outsiderId: string;
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
  const buyerId = async () => (await prisma.user.findUnique({ where: { email: buyerEmail } }))!.id;

  let paidCourse: Awaited<ReturnType<typeof createCourse>>;
  let freeCourse: Awaited<ReturnType<typeof createCourse>>;

  beforeAll(async () => {
    // No real GoHighLevel calls from tests.
    process.env.GHL_API_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ contact: { id: "contact-all" } })));

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
    vi.unstubAllGlobals();
    if (savedGhlToken === undefined) delete process.env.GHL_API_TOKEN;
    else process.env.GHL_API_TOKEN = savedGhlToken;

    const students = await prisma.user.findMany({
      where: { email: { in: [buyerEmail, outsiderEmail] } },
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

  it('reads "all", "*" or a missing course_slug as every course, and a list as specific courses', () => {
    const body = (course_slug?: string) => ({ email: "a@b.co", customData: { course_slug } });
    expect(toCoursePurchase(body("all")).courseSlugs).toEqual([ALL_COURSES]);
    expect(toCoursePurchase(body("ALL")).courseSlugs).toEqual([ALL_COURSES]);
    expect(toCoursePurchase(body(undefined)).courseSlugs).toEqual([ALL_COURSES]);
    expect(toCoursePurchase(body("one, two")).courseSlugs).toEqual(["one", "two"]);
  });

  it("refuses self-enrollment in a paid course without a purchase, but allows a free one", async () => {
    await expect(enrollInCourse(student(outsiderId), paidCourse.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await getAccessibleEnrollment({ id: outsiderId }, paidCourse.id)).toBeNull();

    const free = await enrollInCourse(student(outsiderId), freeCourse.id);
    expect(free.status).toBe(EnrollmentStatus.ACTIVE);
  });

  it("enrolls an all-courses buyer in every published course", async () => {
    // The database is shared with test files running in parallel, each with
    // its own short-lived published courses. Narrow "every published course"
    // to this file's own, so the buyer is not enrolled into theirs.
    const realFindMany = prisma.course.findMany.bind(prisma.course);
    const askedFor: { where?: object }[] = [];
    const findMany = vi.spyOn(prisma.course, "findMany").mockImplementation(((args: { where?: object }) => {
      askedFor.push(args);
      return realFindMany({ ...args, where: { ...args?.where, id: { in: courseIds } } } as never);
    }) as never);

    const result = await handleCoursePurchase(
      { email: buyerEmail, name: "All Buyer", courseSlugs: [ALL_COURSES], transactionId: txn, contactId: "contact-all" },
      headers,
    ).finally(() => findMany.mockRestore());
    const userId = await buyerId();

    // The query itself asked for every published course, with no slug filter.
    expect(askedFor[0]).toMatchObject({ where: { status: CourseStatus.PUBLISHED } });
    expect(askedFor[0]!.where).not.toHaveProperty("slug");

    expect(result.enrolledCourseSlugs).toEqual(expect.arrayContaining([paidCourse.slug, freeCourse.slug]));
    expect((await prisma.payment.findUnique({ where: { ghlTransactionId: txn } }))!.courseSlugs).toEqual([ALL_COURSES]);
    expect(await hasAllCourseAccess(userId)).toBe(true);
    for (const course of [paidCourse, freeCourse]) {
      expect((await getAccessibleEnrollment({ id: userId }, course.id))?.status).toBe(EnrollmentStatus.ACTIVE);
    }
  }, 30_000);

  it("opens a course published after the purchase on first visit", async () => {
    const userId = await buyerId();
    const later = await createCourse("later", 9900);
    expect(await prisma.enrollment.count({ where: { userId, courseId: later.id } })).toBe(0);

    const enrollment = await getAccessibleEnrollment({ id: userId }, later.id);

    expect(enrollment?.status).toBe(EnrollmentStatus.ACTIVE);
    await expect(requireCourseAccess(student(userId), { id: later.id, instructorId })).resolves.toBeUndefined();
  });

  it("takes back every paid course on refund and stops opening new ones", async () => {
    const userId = await buyerId();

    await handleCourseRefund({ transactionId: txn, courseSlugs: [] });

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
