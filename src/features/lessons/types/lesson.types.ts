import type { CourseLevel, LessonType } from "@/generated/prisma";

export interface SidebarLessonDTO {
  id: string;
  title: string;
  slug: string;
  type: LessonType;
  order: number;
  duration: number;
  completed: boolean;
  current: boolean;
}

export interface SidebarModuleDTO {
  id: string;
  title: string;
  order: number;
  lessons: SidebarLessonDTO[];
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
}

export interface QuizAnswerDTO {
  id: string;
  answer: string;
}

export interface QuizQuestionDTO {
  id: string;
  question: string;
  type: string;
  order: number;
  answers: QuizAnswerDTO[];
}

export interface QuizForTakingDTO {
  id: string;
  title: string;
  questions: QuizQuestionDTO[];
}

export interface LearnLessonViewDTO {
  course: { id: string; title: string; slug: string; level: CourseLevel };
  lesson: {
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    videoUrl: string | null;
    duration: number;
    type: LessonType;
    moduleId: string;
    moduleTitle: string;
  };
  quiz: QuizForTakingDTO | null;
  modules: SidebarModuleDTO[];
  progress: {
    totalLessons: number;
    completedLessons: number;
    remainingLessons: number;
    progressPercent: number;
    lessonCompleted: boolean;
    lessonProgressPercent: number;
    lastPosition: number;
    moduleCompletedLessons: number;
    moduleTotalLessons: number;
    moduleProgressPercent: number;
  };
  navigation: {
    previousLessonId: string | null;
    nextLessonId: string | null;
  };
}
