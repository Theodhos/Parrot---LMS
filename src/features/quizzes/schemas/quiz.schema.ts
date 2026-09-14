import { z } from "zod";
import { QuestionType } from "@/generated/prisma";

export const answerInputSchema = z.object({
  answer: z.string().trim().min(1).max(500),
  isCorrect: z.boolean().default(false),
});

export const questionInputSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  type: z.enum(QuestionType).default(QuestionType.SINGLE_CHOICE),
  answers: z.array(answerInputSchema).min(2).max(8),
});

export const createQuizSchema = z.object({
  title: z.string().trim().min(2).max(160),
  questions: z.array(questionInputSchema).min(1).max(50),
});
export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = createQuizSchema.partial();
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;

export const submitQuizAttemptSchema = z.object({
  // questionId -> selected answer id(s)
  answers: z.record(z.string(), z.array(z.string())),
});
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
