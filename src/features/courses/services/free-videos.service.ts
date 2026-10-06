import "server-only";
import { prisma } from "@/lib/db/client";
import { CourseStatus, LessonType } from "@/generated/prisma";
import { storedFileIdOf } from "@/features/media/services/media-db";

/** How many videos the public free-lessons page shows. */
export const FREE_VIDEO_COUNT = 3;

/**
 * The only lessons the public may see or stream without an account: a
 * published video lesson of a published course that costs nothing. Both the
 * page and the video route go through this one filter, so a paid, draft or
 * unpublished video can never leak through either.
 */
const PUBLIC_FREE_VIDEO = {
  type: LessonType.VIDEO,
  published: true,
  module: { course: { status: CourseStatus.PUBLISHED, priceCents: 0 } },
};

export interface FreeVideo {
  lessonId: string;
  title: string;
  courseTitle: string;
  description: string | null;
  durationSeconds: number;
  /** What the player loads: the public video route for a file in the platform's own storage, else the lesson's own URL. */
  src: string;
}

interface FreeVideoCandidate {
  id: string;
  courseId: string;
}

/**
 * Chooses which videos to show, from candidates already in display order:
 * the first video of each free course, then -- when there are fewer free
 * courses than slots -- the following videos in order.
 */
export function pickFreeVideos<T extends FreeVideoCandidate>(ordered: T[], count = FREE_VIDEO_COUNT): T[] {
  const seenCourses = new Set<string>();
  const firstOfEachCourse: T[] = [];
  const others: T[] = [];
  for (const lesson of ordered) {
    if (seenCourses.has(lesson.courseId)) {
      others.push(lesson);
    } else {
      seenCourses.add(lesson.courseId);
      firstOfEachCourse.push(lesson);
    }
  }
  return [...firstOfEachCourse, ...others].slice(0, count);
}

/** The videos of the public free-lessons page. Empty while no free course with a published video exists. */
export async function getFreeVideos(): Promise<FreeVideo[]> {
  const lessons = await prisma.lesson.findMany({
    where: PUBLIC_FREE_VIDEO,
    select: {
      id: true,
      courseId: true,
      title: true,
      description: true,
      duration: true,
      videoUrl: true,
      order: true,
      module: { select: { order: true, course: { select: { title: true, createdAt: true } } } },
    },
  });

  const ordered = lessons
    .filter((lesson) => lesson.videoUrl)
    .sort(
      (a, b) =>
        a.module.course.createdAt.getTime() - b.module.course.createdAt.getTime() ||
        a.courseId.localeCompare(b.courseId) ||
        a.module.order - b.module.order ||
        a.order - b.order,
    );

  return pickFreeVideos(ordered).map((lesson) => ({
    lessonId: lesson.id,
    title: lesson.title,
    courseTitle: lesson.module.course.title,
    description: lesson.description,
    durationSeconds: lesson.duration ?? 0,
    src: storedFileIdOf(lesson.videoUrl!) ? `/free-courses/video/${lesson.id}` : lesson.videoUrl!,
  }));
}

/**
 * The stored file behind a free video, or null when the lesson is not one
 * the public may watch (or its video does not live in the platform's storage).
 */
export async function findFreeVideoFileId(lessonId: string): Promise<string | null> {
  if (!/^[0-9a-f]{24}$/i.test(lessonId)) return null;
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, ...PUBLIC_FREE_VIDEO },
    select: { videoUrl: true },
  });
  return lesson?.videoUrl ? storedFileIdOf(lesson.videoUrl) : null;
}
