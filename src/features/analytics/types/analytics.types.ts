export interface DailyActivityPoint {
  date: string; // YYYY-MM-DD
  minutes: number;
  lessonsCompleted: number;
}

export interface CourseProgressPoint {
  courseId: string;
  courseTitle: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
}

export interface QuizPerformancePoint {
  quizId: string;
  quizTitle: string;
  attempts: number;
  averageScore: number;
  bestScore: number;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  courseTitle: string | null;
  lessonTitle: string | null;
  occurredAt: Date;
}

export interface StudentAnalyticsDTO {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  averageCourseProgress: number;
  totalLessonsCompleted: number;
  totalLessonsRemaining: number;
  totalLearningMinutes: number;
  averageQuizScore: number;
  learningStreakDays: number;
  completionRate: number;
  activityOverTime: DailyActivityPoint[];
  weeklyLearningHours: { day: string; hours: number }[];
  monthlyActivity: { month: string; minutes: number }[];
  progressPerCourse: CourseProgressPoint[];
  quizPerformance: QuizPerformancePoint[];
  recentActivity: RecentActivityItem[];
}

export interface PopularCourseDTO {
  id: string;
  title: string;
  enrollmentCount: number;
  completionRate: number;
}

export interface CoursePerformanceDTO {
  id: string;
  title: string;
  status: string;
  enrollmentCount: number;
  completedCount: number;
  averageProgress: number;
}

export interface AdminAnalyticsDTO {
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  archivedCourses: number;
  totalEnrollments: number;
  courseCompletionRate: number;
  averageCourseProgress: number;
  newEnrollmentsOverTime: { date: string; count: number }[];
  mostPopularCourses: PopularCourseDTO[];
  highestCompletionCourses: PopularCourseDTO[];
  coursePerformance: CoursePerformanceDTO[];
  recentStudentActivity: RecentActivityItem[];
}
