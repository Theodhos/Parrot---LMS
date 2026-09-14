import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CourseLevel, CourseStatus } from "@/generated/prisma";

const LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = [
  { value: CourseLevel.BEGINNER, label: "Beginner" },
  { value: CourseLevel.INTERMEDIATE, label: "Intermediate" },
  { value: CourseLevel.ADVANCED, label: "Advanced" },
];

const STATUS_OPTIONS: { value: CourseStatus; label: string }[] = [
  { value: CourseStatus.DRAFT, label: "Draft" },
  { value: CourseStatus.PUBLISHED, label: "Published" },
  { value: CourseStatus.ARCHIVED, label: "Archived" },
];

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface CourseFiltersBarProps {
  categories: { id: string; name: string; slug: string }[];
  defaultValues: { search?: string; category?: string; level?: string; status?: string };
}

/** GET-navigated filter form (via next/form) -- no client JS required. */
export function CourseFiltersBar({ categories, defaultValues }: CourseFiltersBarProps) {
  const hasFilters = Boolean(
    defaultValues.search || defaultValues.category || defaultValues.level || defaultValues.status,
  );

  return (
    <Form
      action="/admin/courses"
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            id="search"
            name="search"
            placeholder="Search courses..."
            defaultValue={defaultValues.search}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" defaultValue={defaultValues.status ?? ""} className={selectClassName}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <select id="category" name="category" defaultValue={defaultValues.category ?? ""} className={selectClassName}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="level">Level</Label>
        <select id="level" name="level" defaultValue={defaultValues.level ?? ""} className={selectClassName}>
          <option value="">All levels</option>
          {LEVEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" type="button" render={<Link href="/admin/courses">Clear</Link>} />
        )}
      </div>
    </Form>
  );
}
