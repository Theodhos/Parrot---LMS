"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCourseAction, type CourseFormState } from "@/features/courses/actions/course.actions";
import { CourseLevel } from "@/generated/prisma";

const LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = [
  { value: CourseLevel.BEGINNER, label: "Beginner" },
  { value: CourseLevel.INTERMEDIATE, label: "Intermediate" },
  { value: CourseLevel.ADVANCED, label: "Advanced" },
];

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: CourseFormState = { error: null, success: false };

export interface NewCourseFormProps {
  categories: { id: string; name: string }[];
}

export function NewCourseForm({ categories }: NewCourseFormProps) {
  const [state, formAction, pending] = useActionState(createCourseAction, initialState);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required minLength={3} maxLength={120} placeholder="Intro to Watercolor Painting" />
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
          placeholder="What will students learn in this course?"
        />
        {state.fieldErrors?.description && (
          <p className="text-destructive text-xs">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">Category</Label>
          <select id="categoryId" name="categoryId" defaultValue="" className={selectClassName}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoryId && (
            <p className="text-destructive text-xs">{state.fieldErrors.categoryId[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="level">Level</Label>
          <select id="level" name="level" defaultValue={CourseLevel.BEGINNER} className={selectClassName}>
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
        <Input id="thumbnail" name="thumbnail" placeholder="https://..." />
        {state.fieldErrors?.thumbnail && (
          <p className="text-destructive text-xs">{state.fieldErrors.thumbnail[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="price">Price (USD)</Label>
        <Input id="price" name="price" type="number" min={0} step={0.01} placeholder="0" />
        <p className="text-muted-foreground text-xs">
          Leave as 0 for a free course students can enroll in with one click. Any amount above 0
          shows a &quot;Buy&quot; button -- link it to a WooCommerce product after creating the
          course.
        </p>
        {state.fieldErrors?.price && (
          <p className="text-destructive text-xs">{state.fieldErrors.price[0]}</p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Creating..." : "Create course"}
      </Button>
    </form>
  );
}
