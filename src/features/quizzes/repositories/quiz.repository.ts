import "server-only";
import { prisma } from "@/lib/db/client";

export function findQuizByLesson(lessonId: string) {
  return prisma.quiz.findUnique({
    where: { lessonId },
    include: { questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { order: "asc" } } } } },
  });
}

export function findQuizWithAnswerKey(quizId: string) {
  return prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { answers: true } }, lesson: { select: { id: true, courseId: true } } },
  });
}

export function listAttemptsForUser(userId: string, quizId: string) {
  return prisma.quizAttempt.findMany({ where: { userId, quizId }, orderBy: { completedAt: "desc" } });
}

export function createAttempt(data: { userId: string; quizId: string; score: number; answers: Record<string, string[]> }) {
  return prisma.quizAttempt.create({
    data: { userId: data.userId, quizId: data.quizId, score: data.score, answers: data.answers },
  });
}
