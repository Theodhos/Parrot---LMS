import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { AccessStatus, CourseStatus, Role } from "@/generated/prisma";
import { enrollInCourse } from "./enrollment.service";
import { ForbiddenError, NotFoundError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/permissions";

describe("enrollment.service enrollInCourse", () => {
  let studentId: string;
  let instructorId: string;
  let publishedCourseId: string;
  let draftCourseId: string;
  let student: SessionUser;
  const wordpressUserId = Math.floor(Math.random() * 1_000_000_000) + 1;

  beforeAll(async () => {
    // Needs its own wordpressUserId too -- MongoDB's unique index isn't
    // sparse, so two users both lacking the field would collide on it.
    const instructor = await prisma.user.create({
      data: {
        name: "Enroll Test Instructor",
        email: `enroll-instructor-${Date.now()}@test.local`,
        role: Role.INSTRUCTOR,
        wordpressUserId: Math.floor(Math.random() * 1_000_000_000) + 1,
      },
    });
    const studentUser = await prisma.user.create({
      data: {
        name: "Enroll Test Student",
        email: `enroll-student-${Date.now()}@test.local`,
        role: Role.STUDENT,
        wordpressUserId,
      },
    });
    instructorId = instructor.id;
    studentId = studentUser.id;
    student = { id: studentId, role: Role.STUDENT, name: studentUser.name, email: studentUser.email, wordpressUserId };

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
    await prisma.courseAccess.deleteMany({ where: { wordpressUserId } });
    await prisma.course.deleteMany({ where: { id: { in: [publishedCourseId, draftCourseId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [instructorId, studentId] } } });
  });

  it("rejects enrolling in a course the student has not purchased", async () => {
    await expect(enrollInCourse(student, publishedCourseId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("enrolls once WooCommerce-verified access is active", async () => {
    await prisma.courseAccess.create({
      data: {
        wordpressUserId,
        courseId: publishedCourseId,
        courseSlug: "enroll-published",
        woocommerceProductId: 1,
        woocommerceOrderId: 1,
        status: AccessStatus.ACTIVE,
      },
    });

    const enrollment = await enrollInCourse(student, publishedCourseId);
    expect(enrollment.userId).toBe(studentId);
    expect(enrollment.courseId).toBe(publishedCourseId);
    expect(enrollment.status).toBe("ACTIVE");
  });

  it("is idempotent: enrolling again returns the same enrollment instead of erroring", async () => {
    const first = await enrollInCourse(student, publishedCourseId);
    const second = await enrollInCourse(student, publishedCourseId);
    expect(second.id).toBe(first.id);
  });

  it("rejects enrolling in a course that is not published", async () => {
    await expect(enrollInCourse(student, draftCourseId)).rejects.toBeInstanceOf(NotFoundError);
  });
});
