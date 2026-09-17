"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { submitQuizAttemptAction, type SubmitQuizActionResult } from "@/features/quizzes/actions/submit-quiz.actions";
import type { QuizForTakingDTO } from "@/features/lessons/types/lesson.types";
import { QuestionType } from "@/generated/prisma";

export interface QuizPlayerProps {
  courseId: string;
  quiz: QuizForTakingDTO;
}

type QuizResult = NonNullable<SubmitQuizActionResult["data"]>;

/** Multi-question quiz form. Grading, pass/fail, and lesson auto-completion all happen server-side. */
export function QuizPlayer({ courseId, quiz }: QuizPlayerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const allAnswered = quiz.questions.every((q) => (answers[q.id]?.length ?? 0) > 0);

  function setSingleAnswer(questionId: string, answerId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: [answerId] }));
  }

  function toggleMultiAnswer(questionId: string, answerId: string, checked: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const next = checked ? [...current, answerId] : current.filter((id) => id !== answerId);
      return { ...prev, [questionId]: next };
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const res = await submitQuizAttemptAction(courseId, quiz.id, answers);
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Could not submit your quiz.");
        return;
      }
      setResult(res.data);
      toast[res.data.passed ? "success" : "error"](
        res.data.passed ? "You passed! Lesson marked as completed." : "Not quite -- you need 70% to pass.",
      );
      router.refresh();
    });
  }

  function handleRetake() {
    setAnswers({});
    setResult(null);
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.passed ? (
              <CheckCircle2 className="size-5 text-primary" />
            ) : (
              <XCircle className="size-5 text-destructive" />
            )}
            {result.passed ? "Quiz passed" : "Quiz not passed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant={result.passed ? "default" : "destructive"}>
            <AlertTitle>Score: {result.score}%</AlertTitle>
            <AlertDescription>
              {result.correctCount} / {result.totalQuestions} answered correctly.{" "}
              {result.passed
                ? "This lesson is now marked as completed."
                : "You need at least 70% to pass -- give it another go."}
            </AlertDescription>
          </Alert>
          {!result.passed && <Button onClick={handleRetake}>Try again</Button>}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {quiz.questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {index + 1}. {question.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {question.type === QuestionType.MULTIPLE_CHOICE ? (
              <div className="flex flex-col gap-2.5">
                {question.answers.map((answer) => (
                  <Label key={answer.id} className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={(answers[question.id] ?? []).includes(answer.id)}
                      onCheckedChange={(checked) => toggleMultiAnswer(question.id, answer.id, checked)}
                    />
                    {answer.answer}
                  </Label>
                ))}
              </div>
            ) : (
              <RadioGroup
                value={answers[question.id]?.[0] ?? ""}
                onValueChange={(value) => setSingleAnswer(question.id, value)}
              >
                {question.answers.map((answer) => (
                  <Label key={answer.id} className="flex items-center gap-2 font-normal">
                    <RadioGroupItem value={answer.id} />
                    {answer.answer}
                  </Label>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>
      ))}
      <Button type="submit" disabled={isPending || !allAnswered} className="w-fit">
        {isPending ? "Submitting..." : "Submit quiz"}
      </Button>
    </form>
  );
}
