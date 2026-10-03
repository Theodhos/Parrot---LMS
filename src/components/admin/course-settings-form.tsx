"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DeleteCourseButton } from "@/components/admin/delete-course-button";
import {
  updateCourseAction,
  updateCourseStatusAction,
  type CourseFormState,
} from "@/features/courses/actions/course.actions";
import { CourseLevel, CourseStatus } from "@/generated/prisma";
import type { CourseDetailDTO } from "@/features/courses/types/course.types";

const LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = [
  { value: CourseLevel.BEGINNER, label: "Beginner" },
  { value: CourseLevel.INTERMEDIATE, label: "Intermediate" },
  { value: CourseLevel.ADVANCED, label: "Advanced" },
];

const STATUS_THEME: Record<CourseStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  PUBLISHED: {
    label: "Published",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
};

const NEXT_STATUS_ACTIONS: Record<CourseStatus, { status: CourseStatus; label: string }[]> = {
  DRAFT: [
    { status: CourseStatus.PUBLISHED, label: "Publish" },
    { status: CourseStatus.ARCHIVED, label: "Archive" },
  ],
  PUBLISHED: [
    { status: CourseStatus.DRAFT, label: "Move to draft" },
    { status: CourseStatus.ARCHIVED, label: "Archive" },
  ],
  ARCHIVED: [
    { status: CourseStatus.DRAFT, label: "Move to draft" },
    { status: CourseStatus.PUBLISHED, label: "Publish" },
  ],
};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: CourseFormState = { error: null, success: false };

export interface CourseSettingsFormProps {
  course: CourseDetailDTO;
  categories: { id: string; name: string }[];
}

export function CourseSettingsForm({ course, categories }: CourseSettingsFormProps) {
  const router = useRouter();
  const boundAction = updateCourseAction.bind(null, course.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [statusPending, startStatusTransition] = useTransition();

  const currentCategoryId = categories.find((c) => c.name === course.categoryName)?.id ?? "";
  const statusTheme = STATUS_THEME[course.status];
  const canPublish = course.moduleCount > 0 && course.lessonCount > 0;

  useEffect(() => {
    if (state.success) {
      toast.success("Course settings saved.");
    }
  }, [state.success]);

  function handleStatusChange(status: CourseStatus) {
    startStatusTransition(async () => {
      const result = await updateCourseStatusAction(course.id, status);
      if (result.success) {
        toast.success(`Course ${STATUS_THEME[status].label.toLowerCase()}.`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update course status.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Course settings</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`border-transparent font-medium ${statusTheme.className}`}>
              {statusTheme.label}
            </Badge>
            {NEXT_STATUS_ACTIONS[course.status].map((action) => (
              <Button
                key={action.status}
                type="button"
                variant="outline"
                size="sm"
                disabled={statusPending}
                onClick={() => handleStatusChange(action.status)}
              >
                {action.label}
              </Button>
            ))}
            <DeleteCourseButton
              courseId={course.id}
              courseTitle={course.title}
              redirectTo="/admin/courses"
              variant="full"
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!canPublish && course.status === CourseStatus.DRAFT && (
            <p className="text-muted-foreground text-xs">
              Publishing requires at least one module with at least one lesson.
            </p>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required minLength={3} maxLength={120} defaultValue={course.title} />
              {state.fieldErrors?.title && <p className="text-destructive text-xs">{state.fieldErrors.title[0]}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                required
                minLength={10}
                maxLength={5000}
                rows={4}
                defaultValue={course.description}
              />
              {state.fieldErrors?.description && (
                <p className="text-destructive text-xs">{state.fieldErrors.description[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="categoryId">Category</Label>
                <select id="categoryId" name="categoryId" defaultValue={currentCategoryId} className={selectClassName}>
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="level">Level</Label>
                <select id="level" name="level" defaultValue={course.level} className={selectClassName}>
                  {LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="thumbnail">Thumbnail URL</Label>
              <Input id="thumbnail" name="thumbnail" defaultValue={course.thumbnail ?? ""} placeholder="https://..." />
              {state.fieldErrors?.thumbnail && (
                <p className="text-destructive text-xs">{state.fieldErrors.thumbnail[0]}</p>
              )}
            </div>

            <Separator />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step={0.01}
                defaultValue={course.priceCents / 100}
                placeholder="0"
              />
              <p className="text-muted-foreground text-xs">
                Leave as 0 for a free course students can enroll in with one click. Any amount
                above 0 shows a &quot;Buy&quot; button linking to the GoHighLevel checkout below --
                keep this in sync with the real price charged there.
              </p>
              {state.fieldErrors?.price && (
                <p className="text-destructive text-xs">{state.fieldErrors.price[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ghlCheckoutUrl">GoHighLevel checkout URL</Label>
              <Input
                id="ghlCheckoutUrl"
                name="ghlCheckoutUrl"
                type="url"
                defaultValue={course.ghlCheckoutUrl ?? ""}
                placeholder="https://... (required for paid courses to be purchasable)"
              />
              <p className="text-muted-foreground text-xs">
                Paste the URL of this course&apos;s GoHighLevel checkout page (funnel order form or
                payment link). In the GoHighLevel workflow that runs after payment, set the
                webhook&apos;s <code>course_slug</code> to this course&apos;s slug: {course.slug} &mdash; or
                to <code>all</code> if one purchase should unlock every course.
              </p>
              {state.fieldErrors?.ghlCheckoutUrl && (
                <p className="text-destructive text-xs">{state.fieldErrors.ghlCheckoutUrl[0]}</p>
              )}
            </div>

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
