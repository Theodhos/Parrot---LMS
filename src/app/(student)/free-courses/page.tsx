import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { CourseCard } from "@/components/courses/course-card";
import { requireCurrentUser } from "@/lib/auth/session";
import { listCourses } from "@/features/courses/services/course.service";
import { listMyEnrollments } from "@/features/enrollments/services/enrollment.service";
import { listCoursesQuerySchema } from "@/features/courses/schemas/course.schema";
import { CourseStatus } from "@/generated/prisma";

export const metadata: Metadata = { title: "Free Courses" };

/**
 * The free courses on a page of their own: every published course that costs
 * nothing, open to any signed-in member. It is where a free member lands
 * after creating their password.
 */
export default async function FreeCoursesPage() {
  const user = await requireCurrentUser();

  const [{ items }, enrollments] = await Promise.all([
    listCourses(listCoursesQuerySchema.parse({ status: CourseStatus.PUBLISHED, pageSize: 50 }), { freeOnly: true }),
    listMyEnrollments(user),
  ]);

  const enrollmentStatusByCourseId = new Map(enrollments.map((e) => [e.courseId, e.status]));
  const progressByCourseId = new Map(enrollments.map((e) => [e.courseId, e.progressPercent]));

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100 via-lime-50 to-emerald-50 p-6 ring-1 ring-emerald-200/60 sm:p-8 dark:from-emerald-500/10 dark:via-transparent dark:to-transparent dark:ring-emerald-500/20">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
          <Gift className="size-3.5" />
          Free courses
        </span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Start learning for free</h1>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm">
          {items.length === 0
            ? "Courses you can take without paying will appear here."
            : `${items.length} free course${items.length === 1 ? "" : "s"} — open one and start right away.`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Gift className="text-muted-foreground size-8" />
          <p className="font-medium">No free courses yet</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            We&apos;re preparing them. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              enrollmentStatus={enrollmentStatusByCourseId.get(course.id) ?? null}
              progressPercent={progressByCourseId.get(course.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
