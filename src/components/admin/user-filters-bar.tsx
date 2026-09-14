import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Role } from "@/generated/prisma";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: Role.STUDENT, label: "Student" },
  { value: Role.INSTRUCTOR, label: "Instructor" },
  { value: Role.ADMIN, label: "Admin" },
];

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface UserFiltersBarProps {
  defaultValues: { search?: string; role?: string };
}

/** GET-navigated filter form (via next/form) -- no client JS required. */
export function UserFiltersBar({ defaultValues }: UserFiltersBarProps) {
  const hasFilters = Boolean(defaultValues.search || defaultValues.role);

  return (
    <Form action="/admin/users" className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            id="search"
            name="search"
            placeholder="Search by name or email..."
            defaultValue={defaultValues.search}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="role">Role</Label>
        <select id="role" name="role" defaultValue={defaultValues.role ?? ""} className={selectClassName}>
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((option) => (
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
          <Button variant="ghost" size="sm" type="button" render={<Link href="/admin/users">Clear</Link>} />
        )}
      </div>
    </Form>
  );
}
