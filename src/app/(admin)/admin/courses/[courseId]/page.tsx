import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CourseSettingsForm } from "@/components/admin/course-settings-form";
import { CourseTreeEditor } from "@/components/admin/course-tree-editor";
import { requireCurrentUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError } from "@/lib/errors/app-error";
import { getManageableCourseById, listCategories } from "@/features/courses/services/course.service";
import { Role } from "@/generated/prisma";

interface CourseEditorPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseEditorPage({ params }: CourseEditorPageProps) {
  const { courseId } = await params;
  const user = await requireCurrentUser();

  let course;
  try {
    course = await getManageableCourseById(user, courseId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/admin/courses");
    throw error;
  }

  const categories = await listCategories();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/admin/courses">Courses</Link>} />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{course.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/courses"
            aria-label="Back to courses"
            title="Back to courses"
            className="text-muted-foreground hover:bg-muted hover:text-foreground -ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
        </div>
      </div>

      <CourseSettingsForm course={course} categories={categories} canAddCategories={user.role === Role.ADMIN} />

      <CourseTreeEditor courseId={course.id} initialModules={course.modules} />
    </div>
  );
}
