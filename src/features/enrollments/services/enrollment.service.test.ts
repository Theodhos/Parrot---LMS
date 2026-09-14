import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, Role } from "@/generated/prisma";
import { enrollInCourse } from "./enrollment.service";
import { ConflictError, NotFoundError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/permissions";

describe("enrollment.service enrollInCourse", () => {
  let studentId: string;
  let instructorId: string;
  let publishedCourseId: string;
  let draftCourseId: string;
  let student: SessionUser;

  beforeAll(async () => {
    const instructor = await prisma.user.create({
      data: { name: "Enroll Test Instructor", email: `enroll-instructor-${Date.now()}@test.local`, role: Role.INSTRUCTOR },
    });
    const studentUser = await prisma.user.create({
      data: { name: "Enroll Test Student", email: `enroll-student-${Date.now()}@test.local`, role: Role.STUDENT },
    });
    instructorId = instructor.id;
    studentId = studentUser.id;
    student = { id: studentId, role: Role.STUDENT, name: studentUser.name, email: studentUser.email };

    const published = await prisma.course.create({
      data: {
        title: "Enroll Test Published Course",
        slug: `enroll-published-${Date.now()}`,
        description: "fixture",
        status: CourseStatus.PUBLISHED,
        instructorId,
      },
    });
    publishedCourseId = published.id;

    const draft = await prisma.course.create({
      data: {
        title: "Enroll Test Draft Course",
        slug: `enroll-draft-${Date.now()}`,
        description: "fixture",
        status: CourseStatus.DRAFT,
        instructorId,
      },
    });
    draftCourseId = draft.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: studentId } });
    await prisma.learningActivity.deleteMany({ where: { userId: studentId } });
    await prisma.enrollment.deleteMany({ where: { userId: studentId } });
    await prisma.course.deleteMany({ where: { id: { in: [publishedCourseId, draftCourseId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [instructorId, studentId] } } });
  });

  it("enrolls a student in a published course", async () => {
    const enrollment = await enrollInCourse(student, publishedCourseId);
    expect(enrollment.userId).toBe(studentId);
    expect(enrollment.courseId).toBe(publishedCourseId);
    expect(enrollment.status).toBe("ACTIVE");
  });

  it("rejects a duplicate enrollment", async () => {
    await expect(enrollInCourse(student, publishedCourseId)).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects enrolling in a course that is not published", async () => {
    await expect(enrollInCourse(student, draftCourseId)).rejects.toBeInstanceOf(NotFoundError);
  });
});
