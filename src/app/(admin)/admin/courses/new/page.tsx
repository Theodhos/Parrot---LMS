import { NewCourseForm } from "@/components/admin/new-course-form";
import { requireCurrentUser } from "@/lib/auth/session";
import { listCategories } from "@/features/courses/services/course.service";
import { Role } from "@/generated/prisma";

export default async function NewCoursePage() {
  const [user, categories] = await Promise.all([requireCurrentUser(), listCategories()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New course</h1>
        <p className="text-muted-foreground text-sm">
          Start with the basics -- you&apos;ll add modules and lessons on the next screen.
        </p>
      </div>

      <NewCourseForm categories={categories} canAddCategories={user.role === Role.ADMIN} />
    </div>
  );
}
