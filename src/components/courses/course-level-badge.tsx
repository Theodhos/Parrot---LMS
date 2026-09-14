import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LEVEL_THEME } from "@/components/courses/course-theme";
import type { CourseLevel } from "@/generated/prisma";

const LEVEL_LABELS: Record<CourseLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export function CourseLevelBadge({ level, className }: { level: CourseLevel; className?: string }) {
  const accent = LEVEL_THEME[level];
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", accent.bg, accent.text, className)}>
      {LEVEL_LABELS[level]}
    </Badge>
  );
}
