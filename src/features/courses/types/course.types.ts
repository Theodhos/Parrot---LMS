import type { CourseLevel, CourseStatus, LessonType } from "@/generated/prisma";

export interface CourseListItemDTO {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  level: CourseLevel;
  status: CourseStatus;
  categoryName: string | null;
  instructorId: string;
  instructorName: string;
  moduleCount: number;
  lessonCount: number;
  totalDurationSeconds: number;
  enrollmentCount: number;
  averageRating: number | null;
  createdAt: Date;
}

export interface LessonOutlineDTO {
  id: string;
  title: string;
  slug: string;
  type: LessonType;
  duration: number;
  order: number;
  published: boolean;
  hasQuiz: boolean;
}

export interface ModuleOutlineDTO {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LessonOutlineDTO[];
}

export interface CourseDetailDTO extends CourseListItemDTO {
  instructorImage: string | null;
  instructorBio: string | null;
  modules: ModuleOutlineDTO[];
}
