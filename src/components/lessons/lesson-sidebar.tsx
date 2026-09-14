import Link from "next/link";
import { CheckCircle2, Circle, FileText, HelpCircle, PlayCircle, FileBox } from "lucide-react";
import { ProgressSummary } from "@/components/progress/progress-summary";
import { cn } from "@/lib/utils";
import type { SidebarModuleDTO } from "@/features/lessons/types/lesson.types";
import { LessonType } from "@/generated/prisma";

const LESSON_TYPE_ICON: Record<LessonType, typeof FileText> = {
  ARTICLE: FileText,
  VIDEO: PlayCircle,
  QUIZ: HelpCircle,
  DOCUMENT: FileBox,
};

export interface LessonSidebarProps {
  courseId: string;
  courseTitle: string;
  modules: SidebarModuleDTO[];
  progress: { progressPercent: number; completedLessons: number; totalLessons: number };
}

/** The learn page's left rail: course progress plus a checklist of every module/lesson, current one highlighted. */
export function LessonSidebar({ courseId, courseTitle, modules, progress }: LessonSidebarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Course</p>
        <Link href={`/courses/${courseId}`} className="font-medium hover:underline">
          {courseTitle}
        </Link>
      </div>

      <ProgressSummary
        percent={progress.progressPercent}
        completedLessons={progress.completedLessons}
        totalLessons={progress.totalLessons}
      />

      <nav className="flex flex-col gap-4">
        {modules.map((module) => (
          <div key={module.id} className="flex flex-col gap-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">{module.title}</p>
            <ul className="flex flex-col gap-0.5">
              {module.lessons.map((lesson) => {
                const Icon = LESSON_TYPE_ICON[lesson.type];
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/learn/${courseId}/${lesson.id}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        lesson.current
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {lesson.completed ? (
                        <CheckCircle2
                          className={cn("size-4 shrink-0", lesson.current ? "text-primary-foreground" : "text-primary")}
                        />
                      ) : (
                        <Circle className="size-4 shrink-0 opacity-60" />
                      )}
                      <Icon className="size-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{lesson.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
