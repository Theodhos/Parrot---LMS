import { FileText, HelpCircle, PlayCircle, FileBox } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { LESSON_TYPE_THEME, pickAccent } from "@/components/courses/course-theme";
import { cn, formatDuration } from "@/lib/utils";
import type { ModuleOutlineDTO } from "@/features/courses/types/course.types";
import { LessonType } from "@/generated/prisma";

const LESSON_TYPE_ICON: Record<LessonType, typeof FileText> = {
  ARTICLE: FileText,
  VIDEO: PlayCircle,
  QUIZ: HelpCircle,
  DOCUMENT: FileBox,
};

export interface CourseOutlineProps {
  modules: ModuleOutlineDTO[];
}

/** Read-only module/lesson outline for the course detail page (no completion state -- that lives on the learn page). */
export function CourseOutline({ modules }: CourseOutlineProps) {
  return (
    <Accordion defaultValue={modules[0] ? [modules[0].id] : []} className="gap-3">
      {modules.map((module, index) => {
        const accent = pickAccent(module.id);
        return (
          <AccordionItem
            key={module.id}
            value={module.id}
            className={cn("mb-3 overflow-hidden rounded-2xl border bg-card px-1 ring-1 last:mb-0", accent.ring)}
          >
            <AccordionTrigger className="px-3 py-3 hover:no-underline">
              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      accent.bg,
                      accent.text,
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-0.5 text-left">
                    <span>{module.title}</span>
                    {module.description && (
                      <span className="line-clamp-1 text-xs font-normal text-muted-foreground">
                        {module.description}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={cn("shrink-0 border-transparent font-medium", accent.bg, accent.text)}>
                  {module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <ul className="flex flex-col gap-1.5">
                {module.lessons.map((lesson) => {
                  const Icon = LESSON_TYPE_ICON[lesson.type];
                  const lessonAccent = LESSON_TYPE_THEME[lesson.type];
                  return (
                    <li
                      key={lesson.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
                    >
                      <span className="flex items-center gap-2.5 text-foreground">
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full",
                            lessonAccent.bg,
                            lessonAccent.text,
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        {lesson.title}
                        {lesson.hasQuiz && lesson.type !== LessonType.QUIZ && (
                          <HelpCircle className="size-3.5 text-muted-foreground" />
                        )}
                      </span>
                      {lesson.duration > 0 && <span className="shrink-0">{formatDuration(lesson.duration)}</span>}
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
