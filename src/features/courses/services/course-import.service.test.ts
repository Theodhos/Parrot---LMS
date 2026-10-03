import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, Role } from "@/generated/prisma";
import { ForbiddenError } from "@/lib/errors/app-error";
import { parseCourseImportFile } from "@/features/courses/import/course-import";
import { importCourses } from "./course-import.service";

describe("importCourses (local MongoDB-backed)", () => {
  const stamp = Date.now();
  let instructorId: string;

  const csv = [
    "course_title,course_description,level,price,checkout_url,module_title,lesson_title,lesson_type,video_url,duration_seconds",
    `Import A ${stamp},First imported course for the test,INTERMEDIATE,25,https://pay.example.com/a,Module One,Lesson 1,VIDEO,https://videos.example.com/1.mp4,120`,
    `Import A ${stamp},,,,,Module One,Lesson 2,VIDEO,https://videos.example.com/2.mp4,60`,
    `Import A ${stamp},,,,,Module Two,Reading,ARTICLE,,`,
    `Import B ${stamp},Second imported course for the test,,,,,,,,`,
  ].join("\n");

  beforeAll(async () => {
    const instructor = await prisma.user.create({
      data: { name: "Importer", email: `importer-${stamp}@test.local`, role: Role.INSTRUCTOR },
    });
    instructorId = instructor.id;
  });

  afterAll(async () => {
    // By owner, not by the ids the test collected: a run that is cut off
    // mid-import must still leave nothing behind.
    const courseIds = (await prisma.course.findMany({ where: { instructorId }, select: { id: true } })).map((c) => c.id);
    await prisma.lesson.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.module.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.user.deleteMany({ where: { id: instructorId } });
  });

  it("creates draft courses with their modules and lessons in file order, owned by the importer", async () => {
    const { courses, errors } = parseCourseImportFile(csv, "courses.csv");
    expect(errors).toEqual([]);

    const outcome = await importCourses({ id: instructorId, role: Role.INSTRUCTOR } as never, courses);

    expect(outcome.failedAt).toBeUndefined();
    expect(outcome.imported.map((c) => [c.title, c.moduleCount, c.lessonCount])).toEqual([
      [`Import A ${stamp}`, 2, 3],
      [`Import B ${stamp}`, 0, 0],
    ]);

    const courseA = await prisma.course.findUnique({
      where: { id: outcome.imported[0]!.id },
      include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } },
    });
    expect(courseA).toMatchObject({
      status: CourseStatus.DRAFT,
      instructorId,
      level: "INTERMEDIATE",
      priceCents: 2500,
      ghlCheckoutUrl: "https://pay.example.com/a",
    });
    expect(courseA!.modules.map((m) => [m.title, m.lessons.map((l) => l.title)])).toEqual([
      ["Module One", ["Lesson 1", "Lesson 2"]],
      ["Module Two", ["Reading"]],
    ]);
    expect(courseA!.modules[0]!.lessons[0]).toMatchObject({
      type: "VIDEO",
      videoUrl: "https://videos.example.com/1.mp4",
      duration: 120,
      published: true,
    });
  }, 60_000);

  it("is refused for a student", async () => {
    const { courses } = parseCourseImportFile(csv, "courses.csv");
    await expect(importCourses({ id: instructorId, role: Role.STUDENT } as never, courses)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
