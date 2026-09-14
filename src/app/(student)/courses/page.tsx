import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/course-card";
import { CourseFilters } from "@/components/courses/course-filters";
import { requireCurrentUser } from "@/lib/auth/session";
import { listCourses, listCategories } from "@/features/courses/services/course.service";
import { listMyEnrollments } from "@/features/enrollments/services/enrollment.service";
import { listCoursesQuerySchema } from "@/features/courses/schemas/course.schema";
import { cn } from "@/lib/utils";
import { CourseStatus } from "@/generated/prisma";

interface CoursesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const user = await requireCurrentUser();
  const sp = await searchParams;

  const search = firstString(sp.search);
  const category = firstString(sp.category);
  const level = firstString(sp.level);
  const pageParam = firstString(sp.page);

  const query = listCoursesQuerySchema.parse({
    status: CourseStatus.PUBLISHED,
    search: search || undefined,
    category: category || undefined,
    level: level || undefined,
    page: pageParam || undefined,
  });

  const [{ items, total, page, pageCount }, categories, enrollments] = await Promise.all([
    listCourses(query),
    listCategories(),
    listMyEnrollments(user),
  ]);

  const enrollmentStatusByCourseId = new Map(enrollments.map((e) => [e.courseId, e.status]));

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 p-6 ring-1 ring-amber-200/60 sm:p-8 dark:from-amber-500/10 dark:via-transparent dark:to-transparent dark:ring-amber-500/20">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-300">
          <Sparkles className="size-3.5" />
          Course library
        </span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Browse all courses
        </h1>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm">
          {total} published course{total === 1 ? "" : "s"} — every course we offer, no exceptions.
        </p>
      </div>

      <CourseFilters categories={categories} defaultValues={{ search, category, level }} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="text-muted-foreground size-8" />
          <p className="font-medium">No courses match your filters</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Try a different search term or clear the filters to see everything on offer.
          </p>
          <Button
            variant="outline"
            className="mt-2 !rounded-full"
            render={<Link href="/courses">Clear filters</Link>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              enrollmentStatus={enrollmentStatusByCourseId.get(course.id) ?? null}
            />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (category) params.set("category", category);
            if (level) params.set("level", level);
            params.set("page", String(p));
            return (
              <Button
                key={p}
                size="sm"
                variant={p === page ? "default" : "outline"}
                className={cn("!rounded-full", p === page && "!bg-orange-500 !text-white")}
                render={<Link href={`/courses?${params.toString()}`}>{p}</Link>}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
