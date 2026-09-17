import Link from "next/link";
import { FileText, HelpCircle, PlayCircle, FileBox, CheckCircle2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { LESSON_TYPE_THEME, pickAccent } from "@/components/courses/course-theme";
import { cn, formatDuration } from "@/lib/utils";
import { LessonType } from "@/generated/prisma";

const LESSON_TYPE_ICON: Record<LessonType, typeof FileText> = {
  ARTICLE: FileText,
  VIDEO: PlayCircle,
  QUIZ: HelpCircle,
  DOCUMENT: FileBox,
};

/** Structurally compatible with both the course landing page's ModuleOutlineDTO and the
 * learn-player's SidebarModuleDTO, so this one component can render either the static
 * marketing preview or the enrolled, clickable player outline. */
interface OutlineLesson {
  id: string;
  title: string;
  type: LessonType;
  duration: number;
  hasQuiz?: boolean;
}

interface OutlineModule {
  id: string;
  title: string;
  description?: string | null;
  lessons: OutlineLesson[];
}

export interface CourseOutlineProps {
  modules: OutlineModule[];
  /** Lesson ids the current user has completed. Omit when not enrolled -- no progress is rendered. */
  completedLessonIds?: Set<string>;
  /** When provided, every lesson links to `/courses/{courseSlug}?lesson={id}` instead of being plain text -- turns the outline into the enrolled course player's sidebar. */
  courseSlug?: string;
  /** The lesson currently playing; highlighted and used to auto-expand its module. */
  activeLessonId?: string;
}

/** Module/lesson outline for the course detail page. When completedLessonIds is provided, shows
 * per-module and per-lesson progress. When courseSlug is also provided, lessons become links that
 * switch the active lesson in the enrolled course player. */
export function CourseOutline({ modules, completedLessonIds, courseSlug, activeLessonId }: CourseOutlineProps) {
  const showProgress = completedLessonIds !== undefined;
  const activeModuleId = activeLessonId
    ? modules.find((m) => m.lessons.some((l) => l.id === activeLessonId))?.id
    : undefined;
  const defaultOpen = activeModuleId ? [activeModuleId] : modules[0] ? [modules[0].id] : [];

  return (
    // Base UI's Accordion is uncontrolled -- defaultValue only seeds its initial state. Navigating
    // to a lesson in a different module changes defaultOpen, but without a fresh instance the
    // Accordion would just warn and keep the stale open module. Keying on the active module forces
    // a remount (and a real re-seed) exactly when that happens, while staying stable -- and keeping
    // any modules the student expanded by hand -- while moving between lessons in the same module.
    <Accordion key={activeModuleId ?? modules[0]?.id} defaultValue={defaultOpen} className="gap-3">
      {modules.map((module, index) => {
        const accent = pickAccent(module.id);
        const totalLessons = module.lessons.length;
        const completedInModule = completedLessonIds
          ? module.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length
          : 0;
        const modulePercent = totalLessons === 0 ? 0 : Math.round((completedInModule / totalLessons) * 100);

        return (
          <AccordionItem
            key={module.id}
            value={module.id}
            className={cn(
              "bg-card mb-3 overflow-hidden rounded-2xl border px-1 ring-1 last:mb-0",
              accent.ring,
            )}
          >
            <AccordionTrigger className="px-3 py-3 hover:no-underline">
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        modulePercent >= 100
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : cn(accent.bg, accent.text),
                      )}
                    >
                      {modulePercent >= 100 ? <CheckCircle2 className="size-4" /> : index + 1}
                    </span>
                    <div className="flex flex-col gap-0.5 text-left">
                      <span>{module.title}</span>
                      {module.description && (
                        <span className="text-muted-foreground line-clamp-1 text-xs font-normal">
                          {module.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {showProgress && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent font-medium",
                          modulePercent >= 100
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
                        )}
                      >
                        {modulePercent}%
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn("border-transparent font-medium", accent.bg, accent.text)}
                    >
                      {totalLessons} lesson{totalLessons === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>
                {showProgress && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        modulePercent >= 100 ? "bg-emerald-500" : "bg-sky-500",
                      )}
                      style={{ width: `${modulePercent}%` }}
                    />
                  </div>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <ul className="flex flex-col gap-1.5">
                {module.lessons.map((lesson) => {
                  const Icon = LESSON_TYPE_ICON[lesson.type];
                  const lessonAccent = LESSON_TYPE_THEME[lesson.type];
                  const isCompleted = completedLessonIds?.has(lesson.id) ?? false;
                  const isActive = lesson.id === activeLessonId;
                  const content = (
                    <>
                      <span className={cn("flex items-center gap-2.5", !isActive && "text-foreground")}>
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full",
                            isCompleted
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : isActive
                                ? "bg-primary text-primary-foreground"
                                : cn(lessonAccent.bg, lessonAccent.text),
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
                        </span>
                        {lesson.title}
                        {lesson.hasQuiz && lesson.type !== LessonType.QUIZ && (
                          <HelpCircle className="text-muted-foreground size-3.5" />
                        )}
                      </span>
                      {lesson.duration > 0 && (
                        <span className={cn("shrink-0", !isActive && "text-muted-foreground")}>
                          {formatDuration(lesson.duration)}
                        </span>
                      )}
                    </>
                  );
                  const rowClassName = cn(
                    "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm",
                    isActive ? "bg-primary/10 font-medium text-primary" : "bg-muted/50 text-muted-foreground",
                    courseSlug && "transition-colors hover:bg-accent",
                  );
                  return (
                    <li key={lesson.id}>
                      {courseSlug ? (
                        <Link href={`/courses/${courseSlug}?lesson=${lesson.id}`} className={rowClassName}>
                          {content}
                        </Link>
                      ) : (
                        <div className={rowClassName}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
