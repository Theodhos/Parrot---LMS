import { CheckCircle2, GraduationCap, PlayCircle, Sparkles, Trophy } from "lucide-react";
import {
  AMBER,
  EMERALD,
  ROSE,
  SKY,
  VIOLET,
  type ColorAccent,
} from "@/components/courses/course-theme";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { RecentActivityItem } from "@/features/analytics/types/analytics.types";

const ACTIVITY_ICON: Record<string, typeof PlayCircle> = {
  LESSON_STARTED: PlayCircle,
  LESSON_COMPLETED: CheckCircle2,
  QUIZ_COMPLETED: Trophy,
  COURSE_ENROLLED: GraduationCap,
  COURSE_COMPLETED: Sparkles,
};

const ACTIVITY_ACCENT: Record<string, ColorAccent> = {
  LESSON_STARTED: SKY,
  LESSON_COMPLETED: EMERALD,
  QUIZ_COMPLETED: VIOLET,
  COURSE_ENROLLED: AMBER,
  COURSE_COMPLETED: ROSE,
};

const ACTIVITY_LABEL: Record<string, string> = {
  LESSON_STARTED: "Started",
  LESSON_COMPLETED: "Completed",
  QUIZ_COMPLETED: "Took quiz for",
  COURSE_ENROLLED: "Enrolled in",
  COURSE_COMPLETED: "Completed course",
};

export interface RecentActivityListProps {
  items: RecentActivityItem[];
}

export function RecentActivityList({ items }: RecentActivityListProps) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No activity yet -- start a lesson to see it here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const Icon = ACTIVITY_ICON[item.type] ?? PlayCircle;
        const accent = ACTIVITY_ACCENT[item.type] ?? SKY;
        const label = ACTIVITY_LABEL[item.type] ?? item.type;
        const subject = item.lessonTitle ?? item.courseTitle ?? "";
        return (
          <li key={item.id} className="flex items-start gap-3 text-sm">
            <div
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                accent.bg,
                accent.text,
              )}
            >
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate">
                <span className="text-muted-foreground">{label}</span>{" "}
                <span className="font-medium">{subject}</span>
                {item.lessonTitle && item.courseTitle && (
                  <span className="text-muted-foreground"> in {item.courseTitle}</span>
                )}
              </p>
              <p className="text-muted-foreground text-xs">{formatRelativeTime(item.occurredAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
