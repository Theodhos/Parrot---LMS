import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, Role } from "@/generated/prisma";
import { ForbiddenError } from "@/lib/errors/app-error";
import { listUsers } from "@/features/users/services/user.service";
import { getAdminAnalytics } from "./admin-analytics.service";

/** What an instructor may see in the admin panel: their own courses' students and numbers, nothing else. */
describe("instructor scope of Users and Analytics (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const email = (label: string) => `scope-${label}-${stamp}@test.local`;
  const ids = { instructorA: "", instructorB: "", studentA: "", studentB: "", courseA: "", courseB: "" };

  const session = (id: string, role: Role) => ({ id, role }) as never;
  const query = { page: 1, pageSize: 100 };

  beforeAll(async () => {
    const createUser = (label: string, role: Role) =>
      prisma.user.create({ data: { name: `Scope ${label}`, email: email(label), role } });
    ids.instructorA = (await createUser("instructor-a", Role.INSTRUCTOR)).id;
    ids.instructorB = (await createUser("instructor-b", Role.INSTRUCTOR)).id;
    ids.studentA = (await createUser("student-a", Role.STUDENT)).id;
    ids.studentB = (await createUser("student-b", Role.STUDENT)).id;

    // DRAFT so these never appear in the live catalog or in another test's "published courses".
    const createCourse = (label: string, instructorId: string) =>
      prisma.course.create({
        data: {
          title: `Scope Course ${label}`,
          slug: `scope-course-${label}-${stamp}`,
          description: "test",
          instructorId,
          status: CourseStatus.DRAFT,
        },
      });
    ids.courseA = (await createCourse("a", ids.instructorA)).id;
    ids.courseB = (await createCourse("b", ids.instructorB)).id;

    await prisma.enrollment.create({ data: { userId: ids.studentA, courseId: ids.courseA, progressPercent: 50 } });
    await prisma.enrollment.create({ data: { userId: ids.studentB, courseId: ids.courseB } });
  });

  afterAll(async () => {
    // Students first (cascades their enrollments), then courses, then the instructors they required.
    await prisma.user.deleteMany({ where: { id: { in: [ids.studentA, ids.studentB] } } });
    await prisma.course.deleteMany({ where: { id: { in: [ids.courseA, ids.courseB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.instructorA, ids.instructorB] } } });
  });

  it("lists only the students enrolled in the instructor's own courses", async () => {
    const result = await listUsers(session(ids.instructorA, Role.INSTRUCTOR), query);

    expect(result.items.map((u) => u.id)).toEqual([ids.studentA]);
    expect(result.total).toBe(1);
  });

  it("lists every account for an admin, and nothing for a student", async () => {
    const all = await listUsers(session(ids.instructorA, Role.ADMIN), { ...query, search: `-${stamp}@test.local` });
    expect(all.items.map((u) => u.id).sort()).toEqual(
      [ids.instructorA, ids.instructorB, ids.studentA, ids.studentB].sort(),
    );

    await expect(listUsers(session(ids.studentA, Role.STUDENT), query)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("counts analytics over the instructor's own courses only", async () => {
    const analytics = await getAdminAnalytics(session(ids.instructorA, Role.INSTRUCTOR));

    expect(analytics).toMatchObject({
      totalStudents: 1,
      totalInstructors: 0,
      totalCourses: 1,
      draftCourses: 1,
      totalEnrollments: 1,
      averageCourseProgress: 50,
    });
    expect(analytics.coursePerformance.map((c) => c.id)).toEqual([ids.courseA]);
    expect(analytics.mostPopularCourses.map((c) => c.id)).toEqual([ids.courseA]);
  });

  it("gives an instructor with no courses empty figures, and refuses a student", async () => {
    const fresh = await prisma.user.create({
      data: { name: "Scope fresh", email: email("fresh"), role: Role.INSTRUCTOR },
    });
    try {
      const analytics = await getAdminAnalytics(session(fresh.id, Role.INSTRUCTOR));
      expect(analytics).toMatchObject({ totalStudents: 0, totalCourses: 0, totalEnrollments: 0 });
      expect(analytics.coursePerformance).toEqual([]);
      expect((await listUsers(session(fresh.id, Role.INSTRUCTOR), query)).items).toEqual([]);
    } finally {
      await prisma.user.delete({ where: { id: fresh.id } });
    }

    await expect(getAdminAnalytics(session(ids.studentA, Role.STUDENT))).rejects.toBeInstanceOf(ForbiddenError);
  });
});
