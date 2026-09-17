import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonContent } from "@/components/lessons/lesson-content";
import { LessonVideoPlayer } from "@/components/lessons/lesson-video-player";
import { NextLessonButton } from "@/components/lessons/next-lesson-button";
import { QuizPlayer } from "@/components/lessons/quiz-player";
import { MarkCompleteButton } from "@/components/progress/mark-complete-button";
import { ProgressSummary } from "@/components/progress/progress-summary";
import { cn } from "@/lib/utils";
import type { LearnLessonViewDTO } from "@/features/lessons/types/lesson.types";
import { LessonType } from "@/generated/prisma";

// Provisional clips so a lesson always has something to watch even before a real video is
// authored -- picked deterministically per lesson id. Reuses YouTube links already vetted
// elsewhere in this project's own seed data (prisma/seed.ts), rather than a third-party file
// host: the YouTube embed path never touches our <video>/play() code, so it can't ever throw
// the native player's "NotSupportedError: no supported sources" the way a broken direct file
// URL can.
const PLACEHOLDER_VIDEOS = [
  "https://www.youtube.com/watch?v=eIrMbAQSU34",
  "https://www.youtube.com/watch?v=9JpNY-XAseg",
  "https://www.youtube.com/watch?v=O6P86uwfdR0",
  "https://www.youtube.com/watch?v=kqtD5dpn9C8",
];

function pickPlaceholderVideo(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_VIDEOS[hash % PLACEHOLDER_VIDEOS.length]!;
}

export interface LessonPlayerProps {
  courseSlug: string;
  view: LearnLessonViewDTO;
}

/** The enrolled course page's right-hand pane: video/quiz, lesson body, progress, and chapter navigation.
 * Pairs with CourseOutline (in interactive mode) as the left-hand sidebar on the same /courses/[slug] route. */
export function LessonPlayer({ courseSlug, view }: LessonPlayerProps) {
  const { course, lesson, quiz, progress, navigation } = view;
  const isQuizLesson = lesson.type === LessonType.QUIZ;
  const lessonProgressPercent = progress.lessonCompleted ? 100 : Math.round(progress.lessonProgressPercent);

  const lessonHref = (lessonId: string) => `/courses/${courseSlug}?lesson=${lessonId}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {lesson.moduleTitle}
          </p>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{lesson.title}</h2>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border-transparent font-medium",
            progress.lessonCompleted
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
          )}
        >
          {progress.lessonCompleted ? "Completed" : "In progress"}
        </Badge>
      </div>

      {isQuizLesson && quiz ? (
        <QuizPlayer key={lesson.id} courseId={course.id} quiz={quiz} />
      ) : (
        // Keyed by lesson id: these are client components with their own local state (playback
        // position, play/pause, a possible video error) that must reset when the lesson changes,
        // not carry over from whatever was playing before.
        <LessonVideoPlayer
          key={lesson.id}
          title={lesson.title}
          videoUrl={lesson.videoUrl ?? pickPlaceholderVideo(lesson.id)}
        />
      )}

      {!isQuizLesson && (
        <>
          <Card>
            <CardContent>
              <LessonContent content={lesson.content} />
            </CardContent>
          </Card>

          <ProgressSummary
            percent={lessonProgressPercent}
            completedLessons={progress.moduleCompletedLessons}
            totalLessons={progress.moduleTotalLessons}
            label={`${lesson.moduleTitle} progress`}
            indicatorClassName="!bg-gradient-to-r !from-amber-400 !to-orange-500"
          />
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        {navigation.previousLessonId ? (
          <Button
            variant="outline"
            className="!rounded-full"
            render={
              <Link href={lessonHref(navigation.previousLessonId)}>
                <ArrowLeft />
                Previous
              </Link>
            }
          />
        ) : (
          <Button variant="outline" className="!rounded-full" disabled>
            <ArrowLeft />
            Previous
          </Button>
        )}

        {!isQuizLesson && (
          <MarkCompleteButton courseId={course.id} lessonId={lesson.id} completed={progress.lessonCompleted} />
        )}

        {navigation.nextLessonId ? (
          <NextLessonButton
            courseId={course.id}
            lessonId={lesson.id}
            href={lessonHref(navigation.nextLessonId)}
            completed={progress.lessonCompleted}
            canAutoComplete={!isQuizLesson}
          />
        ) : (
          <Button className="!rounded-full !bg-orange-500 !text-white" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
