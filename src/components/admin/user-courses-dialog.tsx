"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  getUserCourseAccessAction,
  setUserCourseAccessAction,
} from "@/features/users/actions/admin-user.actions";
import type { UserCourseAccess } from "@/features/access/services/course-access.service";

export interface UserCoursesDialogProps {
  user: { id: string; name: string; email: string };
  onClose: () => void;
}

/**
 * Lets an admin decide which courses a member has. A member who has not
 * purchased sees a paid course in their library only once it is assigned
 * here. Render it keyed by the user, so opening it for someone else starts
 * from a clean slate instead of showing the previous member's courses.
 */
export function UserCoursesDialog({ user, onClose }: UserCoursesDialogProps) {
  const [access, setAccess] = useState<UserCourseAccess | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingCourseId, setSavingCourseId] = useState<string | null>(null);

  useEffect(() => {
    // An answer that arrives after the dialog was closed (or re-run in dev) is dropped.
    let cancelled = false;
    getUserCourseAccessAction(user.id).then((result) => {
      if (cancelled) return;
      if (result.success) setAccess(result.access);
      else setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  async function handleToggle(courseId: string, assigned: boolean) {
    setSavingCourseId(courseId);
    const result = await setUserCourseAccessAction(user.id, courseId, assigned);
    if (result.success) {
      setAccess((current) =>
        current && {
          ...current,
          courses: current.courses.map((course) => (course.id === courseId ? { ...course, assigned } : course)),
        },
      );
      toast.success(assigned ? "Course assigned." : "Course taken away.");
    } else {
      toast.error(result.error ?? "Could not update this course.");
    }
    setSavingCourseId(null);
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Courses for {user.name}</DialogTitle>
          <DialogDescription className="break-words">
            {user.email} &middot; switch a course on to open it for this member, off to take it away.
          </DialogDescription>
        </DialogHeader>

        {loadError ? (
          <p className="text-destructive text-sm">{loadError}</p>
        ) : !access ? (
          <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Loading courses...
          </div>
        ) : (
          <div className="flex min-h-0 flex-col gap-3">
            {access.buyer && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                This member has purchased: every published course is already open to them.
              </p>
            )}
            {access.courses.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">There are no published courses yet.</p>
            ) : (
              <ul className="-mr-2 flex max-h-[50vh] flex-col divide-y overflow-y-auto pr-2">
                {access.courses.map((course) => (
                  <li key={course.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium break-words">{course.title}</span>
                      <span className="mt-0.5">
                        <Badge variant="outline" className="bg-muted border-transparent text-[11px] font-medium">
                          {course.priceCents > 0 ? `$${(course.priceCents / 100).toFixed(2)}` : "Free"}
                        </Badge>
                      </span>
                    </div>
                    <Switch
                      checked={course.assigned}
                      disabled={savingCourseId !== null}
                      onCheckedChange={(checked) => handleToggle(course.id, checked)}
                      aria-label={`${course.assigned ? "Take away" : "Assign"} ${course.title}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
