import "server-only";
import { Role } from "@/generated/prisma";
import { requireRole, type SessionUser } from "@/lib/permissions";
import { createCourse } from "@/features/courses/services/course.service";
import { createModule } from "@/features/modules/services/module.service";
import { createLesson } from "@/features/lessons/services/lesson.service";
import type { ImportCourse } from "@/features/courses/import/course-import";

export interface ImportedCourseSummary {
  id: string;
  title: string;
  slug: string;
  moduleCount: number;
  lessonCount: number;
}

export interface CourseImportOutcome {
  imported: ImportedCourseSummary[];
  /** Set when the import stopped partway; everything in `imported` before it was still created. */
  failedAt?: { courseTitle: string; message: string };
}

/**
 * Creates every course in the list, with its modules and lessons, owned by
 * the importing admin/instructor. Goes through the same services as the
 * one-by-one forms, so slugs, ordering and permissions behave identically.
 * Courses arrive as DRAFT -- nothing is visible to students until each one
 * is reviewed and published -- while their lessons are created published, so
 * publishing the course is the only step left.
 *
 * Sequential on purpose: module and lesson order is assigned as "next
 * free position", so creation order is display order. If one course fails,
 * the ones before it stay and the failure is reported; a half-built course
 * is left as a draft for the admin to finish or delete.
 */
export async function importCourses(user: SessionUser, courses: ImportCourse[]): Promise<CourseImportOutcome> {
  requireRole(user, Role.ADMIN, Role.INSTRUCTOR);

  const imported: ImportedCourseSummary[] = [];
  for (const input of courses) {
    try {
      const course = await createCourse(user, {
        title: input.title,
        description: input.description,
        level: input.level,
        price: input.price,
        ghlCheckoutUrl: input.checkoutUrl,
      });

      let lessonCount = 0;
      for (const moduleInput of input.modules) {
        const courseModule = await createModule(user, course.id, {
          title: moduleInput.title,
          description: moduleInput.description,
        });
        for (const lesson of moduleInput.lessons) {
          await createLesson(user, course.id, courseModule.id, {
            title: lesson.title,
            type: lesson.type,
            videoUrl: lesson.videoUrl,
            duration: lesson.duration,
            description: lesson.description,
            content: lesson.content,
            published: true,
          });
          lessonCount += 1;
        }
      }

      imported.push({
        id: course.id,
        title: course.title,
        slug: course.slug,
        moduleCount: input.modules.length,
        lessonCount,
      });
    } catch (error) {
      return {
        imported,
        failedAt: {
          courseTitle: input.title,
          message: error instanceof Error ? error.message : "Unexpected error",
        },
      };
    }
  }

  return { imported };
}
