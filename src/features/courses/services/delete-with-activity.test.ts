import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { ActivityType, CourseStatus, Role } from "@/generated/prisma";
import { ensureEnrollment } from "@/features/enrollments/services/enrollment.service";
import { deleteLesson } from "@/features/lessons/services/lesson.service";
import { deleteModule } from "@/features/modules/services/module.service";
import { deleteCourse } from "./course.service";

/**
 * Content that students have already been active in must still be deletable,
 * and deleting it must not erase the students' activity history.
 */
describe("deleting content students were active in (local MongoDB-backed)", () => {
  const stamp = Date.now();
  let instructorId: string;
  let studentId: string;
  let courseId: string;
  const lessonIds: string[] = [];
  const moduleIds: string[] = [];

  // Uploaded files as the local-disk adapter records them: the Media row holds
  // the path, the lesson holds the absolute URL.
  const ownFile = `/uploads/delete-test-own-${stamp}.mp4`;
  const sharedFile = `/uploads/delete-test-shared-${stamp}.mp4`;
  const absolute = (file: string) => `http://localhost:3010${file}`;
  const mediaExists = async (fileUrl: string) => (await prisma.media.count({ where: { fileUrl } })) === 1;

  const instructor = () => ({ id: instructorId, role: Role.INSTRUCTOR }) as never;
  const activityFor = (where: object) =>
    prisma.learningActivity.findMany({ where: { userId: studentId, ...where }, orderBy: { occurredAt: "asc" } });

  beforeAll(async () => {
    instructorId = (
      await prisma.user.create({
        data: { name: "Owner", email: `delete-owner-${stamp}@test.local`, role: Role.INSTRUCTOR },
      })
    ).id;
    studentId = (await prisma.user.create({ data: { name: "Learner", email: `delete-learner-${stamp}@test.local` } })).id;
    // DRAFT so it never shows in the live catalog or in another test's "published courses".
    courseId = (
      await prisma.course.create({
        data: {
          title: "Delete Me",
          slug: `delete-me-${stamp}`,
          description: "test",
          instructorId,
          status: CourseStatus.DRAFT,
        },
      })
    ).id;

    for (const order of [0, 1]) {
      const mod = await prisma.module.create({ data: { courseId, title: `Module ${order}`, order } });
      moduleIds.push(mod.id);
      const lesson = await prisma.lesson.create({
        data: {
          moduleId: mod.id,
          courseId,
          title: `Lesson ${order}`,
          slug: `lesson-${order}`,
          order: 0,
          published: true,
          // Lesson 0 has a file of its own; lesson 1 shares one with the "keeper" lesson below.
          videoUrl: absolute(order === 0 ? ownFile : sharedFile),
        },
      });
      lessonIds.push(lesson.id);
      // What finishing a lesson leaves behind.
      await prisma.progress.create({ data: { userId: studentId, courseId, lessonId: lesson.id, completed: true } });
      await prisma.learningActivity.create({
        data: { userId: studentId, courseId, lessonId: lesson.id, type: ActivityType.LESSON_COMPLETED },
      });
    }
    await prisma.lesson.create({
      data: { moduleId: moduleIds[0]!, courseId, title: "Keeper", slug: "keeper", order: 1, videoUrl: absolute(sharedFile) },
    });
    for (const fileUrl of [ownFile, sharedFile]) {
      await prisma.media.create({ data: { userId: instructorId, fileName: "delete-test.mp4", fileUrl, type: "VIDEO", size: 1 } });
    }
    // Enrolling logs a COURSE_ENROLLED activity row pointing at the course.
    await ensureEnrollment(studentId, courseId);
  });

  afterAll(async () => {
    await prisma.media.deleteMany({ where: { fileUrl: { in: [ownFile, sharedFile] } } });
    await prisma.user.deleteMany({ where: { id: studentId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: instructorId } });
  });

  it("deletes a lesson a student completed, keeping the activity row without the lesson", async () => {
    await deleteLesson(instructor(), courseId, moduleIds[0]!, lessonIds[0]!);

    expect(await prisma.lesson.findUnique({ where: { id: lessonIds[0]! } })).toBeNull();
    expect(await prisma.progress.count({ where: { lessonId: lessonIds[0]! } })).toBe(0);
    const completed = await activityFor({ type: ActivityType.LESSON_COMPLETED });
    expect(completed).toHaveLength(2);
    expect(completed.map((a) => a.lessonId).sort()).toEqual([lessonIds[1]!, null].sort());
    // Its uploaded video went with it; a file another lesson still plays did not.
    expect(await mediaExists(ownFile)).toBe(false);
    expect(await mediaExists(sharedFile)).toBe(true);
  });

  it("deletes a module whose lesson a student completed", async () => {
    await deleteModule(instructor(), courseId, moduleIds[1]!);

    expect(await prisma.module.findUnique({ where: { id: moduleIds[1]! } })).toBeNull();
    expect(await prisma.lesson.findUnique({ where: { id: lessonIds[1]! } })).toBeNull();
    expect((await activityFor({ type: ActivityType.LESSON_COMPLETED })).every((a) => a.lessonId === null)).toBe(true);
    // The module's video is still used by the "Keeper" lesson in the other module.
    expect(await mediaExists(sharedFile)).toBe(true);
  });

  it("deletes a course that has an enrolled student, keeping the student's history", async () => {
    await deleteCourse(instructor(), courseId);

    expect(await prisma.course.findUnique({ where: { id: courseId } })).toBeNull();
    expect(await prisma.enrollment.count({ where: { courseId } })).toBe(0);
    expect(await prisma.module.count({ where: { courseId } })).toBe(0);
    // The three activity rows survive, detached from the deleted course.
    const history = await activityFor({});
    expect(history).toHaveLength(3);
    expect(history.every((a) => a.courseId === null && a.lessonId === null)).toBe(true);
    // Nothing plays the shared file any more, so it is removed with the course.
    expect(await mediaExists(sharedFile)).toBe(false);
  });
});
