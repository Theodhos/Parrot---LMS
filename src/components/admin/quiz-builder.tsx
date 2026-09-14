"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { saveQuizAction, type QuizRecord } from "@/features/quizzes/actions/manage-quiz.actions";
import { QuestionType } from "@/generated/prisma";

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `k${keySeq}`;
}

interface LocalAnswer {
  key: string;
  answer: string;
  isCorrect: boolean;
}

interface LocalQuestion {
  key: string;
  question: string;
  type: QuestionType;
  answers: LocalAnswer[];
}

function emptyAnswer(): LocalAnswer {
  return { key: nextKey(), answer: "", isCorrect: false };
}

function emptyQuestion(): LocalQuestion {
  return {
    key: nextKey(),
    question: "",
    type: QuestionType.SINGLE_CHOICE,
    answers: [emptyAnswer(), emptyAnswer()],
  };
}

function fromRecord(quiz: QuizRecord | null): { title: string; questions: LocalQuestion[] } {
  if (!quiz || quiz.questions.length === 0) {
    return { title: quiz?.title ?? "", questions: [emptyQuestion()] };
  }
  return {
    title: quiz.title,
    questions: quiz.questions.map((q) => ({
      key: q.id,
      question: q.question,
      type: q.type,
      answers: q.answers.map((a) => ({ key: a.id, answer: a.answer, isCorrect: a.isCorrect })),
    })),
  };
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True / False",
};

export interface QuizBuilderProps {
  courseId: string;
  lessonId: string;
  initialQuiz: QuizRecord | null;
  onSaved?: () => void;
}

export function QuizBuilder({ courseId, lessonId, initialQuiz, onSaved }: QuizBuilderProps) {
  const initial = fromRecord(initialQuiz);
  const [title, setTitle] = useState(initial.title);
  const [questions, setQuestions] = useState<LocalQuestion[]>(initial.questions);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateQuestion(key: string, patch: Partial<LocalQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function changeQuestionType(key: string, type: QuestionType) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== key) return q;
        if (type === QuestionType.MULTIPLE_CHOICE) return { ...q, type };
        // Single choice / true-false: keep only the first correct answer checked.
        const firstCorrectIndex = q.answers.findIndex((a) => a.isCorrect);
        return {
          ...q,
          type,
          answers: q.answers.map((a, i) => ({ ...a, isCorrect: i === firstCorrectIndex })),
        };
      }),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(key: string) {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.key !== key) : prev));
  }

  function addAnswer(qKey: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.key === qKey && q.answers.length < 8 ? { ...q, answers: [...q.answers, emptyAnswer()] } : q)),
    );
  }

  function removeAnswer(qKey: string, aKey: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === qKey && q.answers.length > 2 ? { ...q, answers: q.answers.filter((a) => a.key !== aKey) } : q,
      ),
    );
  }

  function updateAnswerText(qKey: string, aKey: string, answer: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === qKey ? { ...q, answers: q.answers.map((a) => (a.key === aKey ? { ...a, answer } : a)) } : q,
      ),
    );
  }

  function setSingleCorrect(qKey: string, aKey: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === qKey ? { ...q, answers: q.answers.map((a) => ({ ...a, isCorrect: a.key === aKey })) } : q,
      ),
    );
  }

  function toggleCorrect(qKey: string, aKey: string, checked: boolean) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === qKey
          ? { ...q, answers: q.answers.map((a) => (a.key === aKey ? { ...a, isCorrect: checked } : a)) }
          : q,
      ),
    );
  }

  function handleSave() {
    setError(null);
    if (!title.trim()) {
      setError("Give the quiz a title.");
      return;
    }
    for (const q of questions) {
      if (!q.question.trim()) {
        setError("Every question needs text.");
        return;
      }
      if (q.answers.some((a) => !a.answer.trim())) {
        setError("Every answer needs text.");
        return;
      }
      if (!q.answers.some((a) => a.isCorrect)) {
        setError(`"${q.question}" needs at least one correct answer marked.`);
        return;
      }
    }

    startTransition(async () => {
      const result = await saveQuizAction(courseId, lessonId, {
        title: title.trim(),
        questions: questions.map((q) => ({
          question: q.question.trim(),
          type: q.type,
          answers: q.answers.map((a) => ({ answer: a.answer.trim(), isCorrect: a.isCorrect })),
        })),
      });
      if (result.success) {
        toast.success("Quiz saved.");
        onSaved?.();
      } else {
        setError(result.error ?? "Failed to save the quiz.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quiz-title">Quiz title</Label>
          <Input id="quiz-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((q, qIndex) => (
            <div key={q.key} className="rounded-lg border p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Question {qIndex + 1}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={q.type}
                    onChange={(e) => changeQuestionType(q.key, e.target.value as QuestionType)}
                    className="h-7 rounded-lg border border-input bg-transparent px-2 text-xs outline-none dark:bg-input/30"
                  >
                    {Object.values(QuestionType).map((type) => (
                      <option key={type} value={type}>
                        {QUESTION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={questions.length <= 1}
                    onClick={() => removeQuestion(q.key)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 />
                    <span className="sr-only">Remove question</span>
                  </Button>
                </div>
              </div>

              <Input
                value={q.question}
                onChange={(e) => updateQuestion(q.key, { question: e.target.value })}
                placeholder="Question text"
                className="mb-3"
              />

              {q.type === QuestionType.MULTIPLE_CHOICE ? (
                <div className="flex flex-col gap-2">
                  {q.answers.map((a) => (
                    <div key={a.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={a.isCorrect}
                        onCheckedChange={(checked) => toggleCorrect(q.key, a.key, checked === true)}
                      />
                      <Input
                        value={a.answer}
                        onChange={(e) => updateAnswerText(q.key, a.key, e.target.value)}
                        placeholder="Answer text"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={q.answers.length <= 2}
                        onClick={() => removeAnswer(q.key, a.key)}
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Remove answer</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <RadioGroup
                  value={q.answers.find((a) => a.isCorrect)?.key ?? ""}
                  onValueChange={(value) => setSingleCorrect(q.key, value as string)}
                  className="flex flex-col gap-2"
                >
                  {q.answers.map((a) => (
                    <div key={a.key} className="flex items-center gap-2">
                      <RadioGroupItem value={a.key} />
                      <Input
                        value={a.answer}
                        onChange={(e) => updateAnswerText(q.key, a.key, e.target.value)}
                        placeholder="Answer text"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={q.answers.length <= 2}
                        onClick={() => removeAnswer(q.key, a.key)}
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Remove answer</span>
                      </Button>
                    </div>
                  ))}
                </RadioGroup>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={q.answers.length >= 8}
                onClick={() => addAnswer(q.key)}
              >
                <Plus className="size-3.5" />
                Add answer
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={addQuestion} className="w-fit">
          <Plus />
          Add question
        </Button>

        <Separator />

        <Button type="button" onClick={handleSave} disabled={pending} className="w-fit">
          {pending ? "Saving..." : "Save quiz"}
        </Button>
      </CardContent>
    </Card>
  );
}
