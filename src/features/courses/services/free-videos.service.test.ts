// @vitest-environment node
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { CourseStatus, LessonType, Role } from "@/generated/prisma";
import { deleteStoredFile, openStoredFile, saveBuffer, storedFileIdOf } from "@/features/media/services/media-db";
import { serveStoredFile } from "@/features/media/services/serve-stored-file";
import { findFreeVideoFileId, getFreeVideos, pickFreeVideos } from "./free-videos.service";

describe("pickFreeVideos", () => {
  const lesson = (id: string, courseId: string) => ({ id, courseId });

  it("takes the first video of each free course before any second one", () => {
    const ordered = [lesson("a1", "a"), lesson("a2", "a"), lesson("b1", "b"), lesson("c1", "c"), lesson("d1", "d")];
    expect(pickFreeVideos(ordered).map((l) => l.id)).toEqual(["a1", "b1", "c1"]);
  });

  it("fills the remaining slots from the same course when there are fewer free courses", () => {
    const ordered = [lesson("a1", "a"), lesson("a2", "a"), lesson("a3", "a"), lesson("b1", "b")];
    expect(pickFreeVideos(ordered).map((l) => l.id)).toEqual(["a1", "b1", "a2"]);
    expect(pickFreeVideos([lesson("a1", "a")]).map((l) => l.id)).toEqual(["a1"]);
    expect(pickFreeVideos([])).toEqual([]);
  });
});

describe("free videos are the only ones the public can reach (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const data = randomBytes(5000);
  const courseIds: string[] = [];
  let instructorId: string;
  let fileId: string;
  let fileUrl: string;
  const lessonIds = { free: "", freeUnpublished: "", freeArticle: "", paid: "", draft: "" };

  const createCourse = async (label: string, priceCents: number, status: CourseStatus) => {
    const course = await prisma.course.create({
      data: { title: `Free Video Test ${label}`, slug: `free-video-${label}-${stamp}`, description: "test", instructorId, status, priceCents },
    });
    courseIds.push(course.id);
    const courseModule = await prisma.module.create({ data: { courseId: course.id, title: "Module", order: 0 } });
    let order = 0;
    return (title: string, type: LessonType, published: boolean) =>
      prisma.lesson.create({
        data: {
          courseId: course.id,
          moduleId: courseModule.id,
          title,
          slug: `${title.toLowerCase().replace(/\s+/g, "-")}-${stamp}`,
          order: order++,
          type,
          published,
          videoUrl: fileUrl,
          duration: 120,
        },
      });
  };

  beforeAll(async () => {
    const instructor = await prisma.user.create({
      data: { name: "Instructor", email: `free-video-instructor-${stamp}@test.local`, role: Role.INSTRUCTOR },
    });
    instructorId = instructor.id;
    const stored = await saveBuffer(instructorId, { fileName: "free lesson.mp4", contentType: "video/mp4", scope: "course" }, data);
    fileUrl = stored.url;
    fileId = storedFileIdOf(stored.url)!;

    const addToFree = await createCourse("free", 0, CourseStatus.PUBLISHED);
    lessonIds.free = (await addToFree("Free Video", LessonType.VIDEO, true)).id;
    lessonIds.freeUnpublished = (await addToFree("Hidden Video", LessonType.VIDEO, false)).id;
    lessonIds.freeArticle = (await addToFree("Free Article", LessonType.ARTICLE, true)).id;
    lessonIds.paid = (await (await createCourse("paid", 4900, CourseStatus.PUBLISHED))("Paid Video", LessonType.VIDEO, true)).id;
    lessonIds.draft = (await (await createCourse("draft", 0, CourseStatus.DRAFT))("Draft Video", LessonType.VIDEO, true)).id;
  }, 60_000);

  afterAll(async () => {
    // Courses first (their modules and lessons go with them), then the instructor they required.
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.user.deleteMany({ where: { id: instructorId } });
    if (fileId) await deleteStoredFile(fileId);
  });

  it("resolves the file of a published video in a published free course, and nothing else", async () => {
    expect(await findFreeVideoFileId(lessonIds.free)).toBe(fileId);

    expect(await findFreeVideoFileId(lessonIds.freeUnpublished)).toBeNull();
    expect(await findFreeVideoFileId(lessonIds.freeArticle)).toBeNull();
    expect(await findFreeVideoFileId(lessonIds.paid)).toBeNull();
    expect(await findFreeVideoFileId(lessonIds.draft)).toBeNull();
    // A file id (or anything else) in place of a lesson id leads nowhere.
    expect(await findFreeVideoFileId(fileId)).toBeNull();
    expect(await findFreeVideoFileId("not-an-id")).toBeNull();
  });

  it("lists a stored free video through the public route, never a paid, draft or hidden one", async () => {
    const ours = new Set(Object.values(lessonIds));
    const listed = (await getFreeVideos()).filter((video) => ours.has(video.lessonId));

    expect(listed.map((video) => video.lessonId)).toEqual([lessonIds.free]);
    expect(listed[0]).toMatchObject({
      title: "Free Video",
      courseTitle: "Free Video Test free",
      durationSeconds: 120,
      src: `/free-courses/video/${lessonIds.free}`,
    });
  });

  it("serves the stored file whole and by byte range", async () => {
    const file = (await openStoredFile(fileId))!;

    const whole = serveStoredFile(new Request("http://test.local/video"), file, "public, max-age=3600");
    expect(whole.status).toBe(200);
    expect(whole.headers.get("content-type")).toBe("video/mp4");
    expect(whole.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(Buffer.from(await whole.arrayBuffer()).equals(data)).toBe(true);

    const part = serveStoredFile(
      new Request("http://test.local/video", { headers: { range: "bytes=100-199" } }),
      file,
      "public, max-age=3600",
    );
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe(`bytes 100-199/${data.byteLength}`);
    expect(Buffer.from(await part.arrayBuffer()).equals(data.subarray(100, 200))).toBe(true);

    const beyond = serveStoredFile(
      new Request("http://test.local/video", { headers: { range: "bytes=9999-" } }),
      file,
      "public, max-age=3600",
    );
    expect(beyond.status).toBe(416);
  });
});
