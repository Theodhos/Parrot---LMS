import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, LessonType, Role } from "@/generated/prisma";
import { markLessonComplete } from "./progress.service";
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/permissions";

describe("progress.service markLessonComplete", () => {
  let instructorId: string;
  let studentId: string;
  let outsiderId: string;
  let courseId: string;
  let otherCourseId: string;
  const lessonIds: string[] = [];
  let student: SessionUser;

  beforeAll(async () => {
    const instructor = await prisma.user.create({
      data: { name: "Test Instructor", email: `instructor-${Date.now()}@test.local`, role: Role.INSTRUCTOR },
    });
    const studentUser = await prisma.user.create({
      data: { name: "Test Student", email: `student-${Date.now()}@test.local`, role: Role.STUDENT },
    });
    const outsider = await prisma.user.create({
      data: { name: "Unenrolled Student", email: `outsider-${Date.now()}@test.local`, role: Role.STUDENT },
    });
    instructorId = instructor.id;
    studentId = studentUser.id;
    outsiderId = outsider.id;
    student = { id: studentId, role: Role.STUDENT, name: studentUser.name, email: studentUser.email };

    const course = await prisma.course.create({
      data: {
        title: "Progress Test Course",
        slug: `progress-test-course-${Date.now()}`,
        description: "Fixture course for progress service tests",
        status: CourseStatus.PUBLISHED,
        instructorId,
      },
    });
    courseId = course.id;

    const otherCourse = await prisma.course.create({
      data: {
        title: "Other Course",
        slug: `other-course-${Date.now()}`,
        description: "A second course to test cross-course lesson validation",
        status: CourseStatus.PUBLISHED,
        instructorId,
      },
    });
    otherCourseId = otherCourse.id;

    const mod = await prisma.module.create({ data: { title: "Module 1", order: 0, courseId } });

    for (let i = 0; i < 3; i++) {
      const lesson = await prisma.lesson.create({
        data: {
          title: `Lesson ${i + 1}`,
          slug: `lesson-${i + 1}`,
          duration: 60,
          order: i,
          type: LessonType.ARTICLE,
          published: true,
          moduleId: mod.id,
          courseId,
        },
      });
      lessonIds.push(lesson.id);
    }

    await prisma.enrollment.create({ data: { userId: studentId, courseId } });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: studentId } });
    await prisma.learningActivity.deleteMany({ where: { userId: studentId } });
    await prisma.progress.deleteMany({ where: { userId: studentId } });
    await prisma.enrollment.deleteMany({ where: { userId: studentId } });
    await prisma.lesson.deleteMany({ where: { courseId } });
    await prisma.module.deleteMany({ where: { courseId } });
    await prisma.course.deleteMany({ where: { id: { in: [courseId, otherCourseId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [instructorId, studentId, outsiderId] } } });
  });

  it("computes completedLessons/totalLessons*100, rounded, on the first completion", async () => {
    const result = await markLessonComplete(student, courseId, lessonIds[0]!);
    expect(result.totalLessons).toBe(3);
    expect(result.completedLessons).toBe(1);
    expect(result.courseProgressPercent).toBe(33); // round(1/3*100)
    expect(result.courseCompleted).toBe(false);

    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: studentId, courseId } } });
    expect(enrollment.progressPercent).toBe(33);
    expect(enrollment.status).toBe("ACTIVE");
  });

  it("is idempotent: completing the same lesson again does not double-count", async () => {
    const result = await markLessonComplete(student, courseId, lessonIds[0]!);
    expect(result.completedLessons).toBe(1);
    expect(result.courseProgressPercent).toBe(33);

    const activityCount = await prisma.learningActivity.count({
      where: { userId: studentId, lessonId: lessonIds[0]!, type: "LESSON_COMPLETED" },
    });
    expect(activityCount).toBe(1);
  });

  it("marks the course completed and updates enrollment status once every lesson is done", async () => {
    await markLessonComplete(student, courseId, lessonIds[1]!);
    const result = await markLessonComplete(student, courseId, lessonIds[2]!);

    expect(result.completedLessons).toBe(3);
    expect(result.courseProgressPercent).toBe(100);
    expect(result.courseCompleted).toBe(true);

    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: studentId, courseId } } });
    expect(enrollment.status).toBe("COMPLETED");
    expect(enrollment.completedAt).not.toBeNull();

    const notification = await prisma.notification.findFirst({ where: { userId: studentId, type: "ACHIEVEMENT" } });
    expect(notification).not.toBeNull();
  });

  it("rejects completion for a user who is not enrolled", async () => {
    const outsiderUser: SessionUser = { id: outsiderId, role: Role.STUDENT, name: "x", email: "x@test.local" };
    await expect(markLessonComplete(outsiderUser, courseId, lessonIds[0]!)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects a lesson that does not belong to the given course", async () => {
    // Enroll in the other course too, so this exercises the lesson<->course
    // membership check specifically rather than the enrollment check.
    await prisma.enrollment.create({ data: { userId: studentId, courseId: otherCourseId } });
    await expect(markLessonComplete(student, otherCourseId, lessonIds[0]!)).rejects.toBeInstanceOf(ValidationError);
  });
});
