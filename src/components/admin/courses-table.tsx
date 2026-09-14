"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, MoreHorizontal, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CourseLevelBadge } from "@/components/courses/course-level-badge";
import { DeleteCourseButton } from "@/components/admin/delete-course-button";
import { updateCourseStatusAction } from "@/features/courses/actions/course.actions";
import { CourseStatus } from "@/generated/prisma";
import type { CourseListItemDTO } from "@/features/courses/types/course.types";

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

export interface CoursesTableProps {
  initialItems: CourseListItemDTO[];
}

export function CoursesTable({ initialItems }: CoursesTableProps) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleStatusChange(courseId: string, status: CourseStatus) {
    setPendingId(courseId);
    startTransition(async () => {
      const result = await updateCourseStatusAction(courseId, status);
      if (result.success) {
        setItems((prev) => prev.map((c) => (c.id === courseId ? { ...c, status } : c)));
        toast.success(`Course ${STATUS_THEME[status].label.toLowerCase()}.`);
      } else {
        toast.error(result.error ?? "Failed to update course status.");
      }
      setPendingId(null);
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-16 text-center">
        <p className="font-medium">No courses match your filters</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Try a different search term, or create a new course to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Instructor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Enrollments</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((course) => {
            const statusTheme = STATUS_THEME[course.status];
            return (
              <TableRow key={course.id}>
                <TableCell className="max-w-64 whitespace-normal">
                  <Link href={`/admin/courses/${course.id}`} className="font-medium hover:underline">
                    {course.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {course.moduleCount} module{course.moduleCount === 1 ? "" : "s"} ·{" "}
                    {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground">{course.instructorName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`border-transparent font-medium ${statusTheme.className}`}>
                    {statusTheme.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <CourseLevelBadge level={course.level} />
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5" />
                    {course.enrollmentCount}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={<Link href={`/admin/courses/${course.id}`} />}
                    >
                      <Pencil />
                      <span className="sr-only">Edit course</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" disabled={pendingId === course.id} />}
                      >
                        <MoreHorizontal />
                        <span className="sr-only">Change status</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {NEXT_STATUS_ACTIONS[course.status].map((action) => (
                          <DropdownMenuItem
                            key={action.status}
                            onClick={() => handleStatusChange(course.id, action.status)}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DeleteCourseButton
                      courseId={course.id}
                      courseTitle={course.title}
                      onDeleted={() => setItems((prev) => prev.filter((c) => c.id !== course.id))}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
