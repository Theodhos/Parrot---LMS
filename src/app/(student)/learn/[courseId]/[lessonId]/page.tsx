import { notFound, redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LessonSidebar } from "@/components/lessons/lesson-sidebar";
import { LessonContent } from "@/components/lessons/lesson-content";
import { QuizPlayer } from "@/components/lessons/quiz-player";
import { LessonNav } from "@/components/lessons/lesson-nav";
import { MarkCompleteButton } from "@/components/progress/mark-complete-button";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatDuration } from "@/lib/utils";
import { getLearnLessonView } from "@/features/lessons/services/learning.service";
import { ForbiddenError, NotFoundError } from "@/lib/errors/app-error";
import { LessonType } from "@/generated/prisma";

interface LearnLessonPageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function LearnLessonPage({ params }: LearnLessonPageProps) {
  const { courseId, lessonId } = await params;
  const user = await requireCurrentUser();

  let view;
  try {
    view = await getLearnLessonView(user, courseId, lessonId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/dashboard");
    throw error;
  }

  const { course, lesson, quiz, modules, progress, navigation } = view;
  const isQuizLesson = lesson.type === LessonType.QUIZ;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_240px]">
      <aside className="order-2 lg:order-1">
        <div className="lg:sticky lg:top-20">
          <LessonSidebar courseId={course.id} courseTitle={course.title} modules={modules} progress={progress} />
        </div>
      </aside>

      <main className="order-1 flex flex-col gap-6 lg:order-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{lesson.moduleTitle}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
          {lesson.description && <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>}
        </div>

        {isQuizLesson && quiz ? (
          <QuizPlayer courseId={course.id} lessonId={lesson.id} quiz={quiz} />
        ) : (
          <LessonContent lesson={lesson} />
        )}

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <LessonNav
            courseId={course.id}
            previousLessonId={navigation.previousLessonId}
            nextLessonId={navigation.nextLessonId}
          />
          {!isQuizLesson && (
            <MarkCompleteButton courseId={course.id} lessonId={lesson.id} completed={progress.lessonCompleted} />
          )}
        </div>
      </main>

      <aside className="order-3 flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="outline">{lesson.type}</Badge>
            </div>
            {lesson.duration > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="size-3.5" />
                  {formatDuration(lesson.duration)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={progress.lessonCompleted ? "default" : "secondary"}>
                {progress.lessonCompleted ? "Completed" : "In progress"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
