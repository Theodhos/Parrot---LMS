export const APP_NAME = "Parrot LMS";

export const PAGE_SIZE = {
  courses: 12,
  students: 20,
  enrollments: 20,
  notifications: 15,
  activity: 10,
} as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  studentDashboard: "/dashboard",
  courseDetail: (slug: string) => `/courses/${slug}`,
  learn: (courseId: string, lessonId: string) => `/learn/${courseId}/${lessonId}`,
  analytics: "/analytics",
  profile: "/profile",
  adminDashboard: "/admin/dashboard",
  adminCourses: "/admin/courses",
  adminCourseEditor: (courseId: string) => `/admin/courses/${courseId}`,
  adminUsers: "/admin/users",
  adminAnalytics: "/admin/analytics",
  adminMedia: "/admin/media",
} as const;

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const LEARNING_STREAK_TIMEZONE_OFFSET_MINUTES = 0;
