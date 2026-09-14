import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseFiltersBar } from "@/components/admin/course-filters-bar";
import { CoursesTable } from "@/components/admin/courses-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { requireCurrentUser } from "@/lib/auth/session";
import { listCategories, listCourses } from "@/features/courses/services/course.service";
import { listCoursesQuerySchema } from "@/features/courses/schemas/course.schema";
import { Role } from "@/generated/prisma";

interface AdminCoursesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCoursesPage({ searchParams }: AdminCoursesPageProps) {
  const user = await requireCurrentUser();
  const sp = await searchParams;

  const search = firstString(sp.search);
  const category = firstString(sp.category);
  const level = firstString(sp.level);
  const status = firstString(sp.status);
  const pageParam = firstString(sp.page);

  const query = listCoursesQuerySchema.parse({
    search: search || undefined,
    category: category || undefined,
    level: level || undefined,
    status: status || undefined,
    page: pageParam || undefined,
    instructorId: user.role === Role.INSTRUCTOR ? user.id : undefined,
    pageSize: 20,
  });

  const [{ items, total, page, pageCount }, categories] = await Promise.all([
    listCourses(query),
    listCategories(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="text-muted-foreground text-sm">
            {total} course{total === 1 ? "" : "s"}
            {user.role === Role.INSTRUCTOR ? " you teach" : " across the platform"}.
          </p>
        </div>
        <Button render={<Link href="/admin/courses/new" />}>
          <Plus />
          New course
        </Button>
      </div>

      <CourseFiltersBar categories={categories} defaultValues={{ search, category, level, status }} />

      <CoursesTable initialItems={items} />

      <AdminPagination
        page={page}
        pageCount={pageCount}
        basePath="/admin/courses"
        params={{ search, category, level, status }}
      />
    </div>
  );
}
