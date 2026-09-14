import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CourseLevel } from "@/generated/prisma";

const LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = [
  { value: CourseLevel.BEGINNER, label: "Beginner" },
  { value: CourseLevel.INTERMEDIATE, label: "Intermediate" },
  { value: CourseLevel.ADVANCED, label: "Advanced" },
];

const selectClassName =
  "h-8 w-full rounded-full border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface CourseFiltersProps {
  categories: { id: string; name: string; slug: string }[];
  defaultValues: { search?: string; category?: string; level?: string };
}

/** GET-navigated filter form (via next/form) -- no client JS required, keeps /courses a plain Server Component. */
export function CourseFilters({ categories, defaultValues }: CourseFiltersProps) {
  const hasFilters = Boolean(defaultValues.search || defaultValues.category || defaultValues.level);

  return (
    <Form
      action="/courses"
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            name="search"
            placeholder="Search courses..."
            defaultValue={defaultValues.search}
            className="rounded-full pl-8"
          />
        </div>
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
        <Button type="submit" className="!rounded-full !bg-orange-500 !text-white hover:!bg-orange-600">
          Apply filters
        </Button>
        {hasFilters && (
          <Button variant="ghost" type="button" className="!rounded-full" render={<Link href="/courses">Clear</Link>} />
        )}
      </div>
    </Form>
  );
}
