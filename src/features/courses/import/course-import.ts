import { z } from "zod";
import { CourseLevel, LessonType } from "@/generated/prisma";

/**
 * Bulk course import: turns a dropped .csv or .json file into a validated
 * list of courses with their modules and lessons. Pure (no I/O) so the same
 * code builds the preview in the browser and re-validates on the server --
 * the server never trusts what the browser parsed.
 */

const importLessonSchema = z.object({
  title: z.string().trim().min(2, "Lesson title must be at least 2 characters").max(160),
  type: z.enum(LessonType).default(LessonType.VIDEO),
  videoUrl: z.string().trim().url("Video URL must be a full link starting with https://").optional(),
  duration: z.coerce.number().int().min(0).default(0),
  description: z.string().trim().max(2000).optional(),
  content: z.string().max(200_000).optional(),
});

const importModuleSchema = z.object({
  title: z.string().trim().min(2, "Module title must be at least 2 characters").max(120),
  description: z.string().trim().max(2000).optional(),
  lessons: z.array(importLessonSchema).max(300).default([]),
});

const importCourseSchema = z.object({
  title: z.string().trim().min(3, "Course title must be at least 3 characters").max(120),
  description: z.string().trim().min(10, "Course description must be at least 10 characters").max(5000),
  level: z.enum(CourseLevel).default(CourseLevel.BEGINNER),
  /** USD, whole dollars. 0 (or omitted) means free. */
  price: z.coerce.number().min(0).max(10000).default(0),
  checkoutUrl: z.string().trim().url("Checkout URL must be a full link starting with https://").optional(),
  modules: z.array(importModuleSchema).max(100).default([]),
});

export const courseImportSchema = z.array(importCourseSchema).min(1, "The file contains no courses").max(100);

export type ImportLesson = z.infer<typeof importLessonSchema>;
export type ImportModule = z.infer<typeof importModuleSchema>;
export type ImportCourse = z.infer<typeof importCourseSchema>;

export interface CourseImportParseResult {
  courses: ImportCourse[];
  /** Human-readable problems; when non-empty, `courses` is empty and nothing may be imported. */
  errors: string[];
}

export const COURSE_IMPORT_CSV_COLUMNS = [
  "course_title",
  "course_description",
  "level",
  "price",
  "checkout_url",
  "module_title",
  "lesson_title",
  "lesson_type",
  "video_url",
  "duration_seconds",
  "lesson_description",
] as const;

/** A filled-in example an admin can open in Excel, edit, and drop back in. */
export const COURSE_IMPORT_CSV_TEMPLATE = [
  COURSE_IMPORT_CSV_COLUMNS.join(","),
  'Parrot Talking Basics,"Teach your parrot its first words, step by step.",BEGINNER,49,,Getting started,Welcome,VIDEO,https://www.youtube.com/watch?v=eIrMbAQSU34,300,What this course covers',
  "Parrot Talking Basics,,,,,Getting started,Choosing the first word,VIDEO,https://www.youtube.com/watch?v=9JpNY-XAseg,420,",
  "Parrot Talking Basics,,,,,Daily practice,The 10-minute routine,VIDEO,https://www.youtube.com/watch?v=O6P86uwfdR0,600,",
  'Advanced Tricks,"Whistling, mimicry and multi-word phrases for birds that already talk.",ADVANCED,79,,Whistling,First melody,VIDEO,https://www.youtube.com/watch?v=kqtD5dpn9C8,480,',
].join("\n");

/**
 * Minimal RFC 4180 reader: quoted fields, doubled quotes, line breaks inside
 * quotes, CRLF, and a UTF-8 BOM. The delimiter is detected from the header
 * line, because Excel writes ";" instead of "," in many European locales.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const headerLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = headerLine.split(";").length > headerLine.split(",").length ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const blankToUndefined = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * One CSV row per lesson. Rows sharing a course_title form one course and,
 * within it, rows sharing a module_title form one module, in first-seen
 * order. Course-level columns are read from the first row that fills them
 * in, so they only need to be written once per course.
 */
function coursesFromCsv(text: string): unknown[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error("The file is empty");

  const columns = header.map((name) => name.trim().toLowerCase());
  if (!columns.includes("course_title")) {
    throw new Error('The first row must contain the column names, including "course_title"');
  }
  const cell = (row: string[], name: string) => blankToUndefined(row[columns.indexOf(name)]);

  interface RawModule {
    title: string;
    lessons: Record<string, unknown>[];
  }
  interface RawCourse extends Record<string, unknown> {
    title: string;
    modules: RawModule[];
  }
  const courses = new Map<string, RawCourse>();

  for (const row of rows) {
    const title = cell(row, "course_title");
    if (!title) continue;

    let course = courses.get(title.toLowerCase());
    if (!course) {
      course = { title, modules: [] };
      courses.set(title.toLowerCase(), course);
    }
    course.description ??= cell(row, "course_description");
    course.level ??= cell(row, "level")?.toUpperCase();
    course.price ??= cell(row, "price");
    course.checkoutUrl ??= cell(row, "checkout_url");

    const lessonTitle = cell(row, "lesson_title");
    const moduleTitle = cell(row, "module_title") ?? (lessonTitle ? "Lessons" : undefined);
    if (!moduleTitle) continue;

    let courseModule = course.modules.find((m) => m.title.toLowerCase() === moduleTitle.toLowerCase());
    if (!courseModule) {
      courseModule = { title: moduleTitle, lessons: [] };
      course.modules.push(courseModule);
    }
    if (lessonTitle) {
      courseModule.lessons.push({
        title: lessonTitle,
        type: cell(row, "lesson_type")?.toUpperCase(),
        videoUrl: cell(row, "video_url"),
        duration: cell(row, "duration_seconds"),
        description: cell(row, "lesson_description"),
      });
    }
  }
  return [...courses.values()];
}

/** JSON: either `[ {course}, ... ]` or `{ "courses": [ ... ] }`, each course nesting modules -> lessons. */
function coursesFromJson(text: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    throw new Error("The file is not valid JSON");
  }
  if (Array.isArray(parsed)) return parsed;
  const wrapped = (parsed as { courses?: unknown } | null)?.courses;
  if (Array.isArray(wrapped)) return wrapped;
  throw new Error('JSON must be a list of courses, or an object with a "courses" list');
}

/** Describes where a validation problem is, in terms of the admin's own data rather than array indexes. */
function describeIssue(raw: unknown, path: PropertyKey[], message: string): string {
  const courses = Array.isArray(raw) ? (raw as { title?: unknown; modules?: { title?: unknown; lessons?: { title?: unknown }[] }[] }[]) : [];
  const course = typeof path[0] === "number" ? courses[path[0]] : undefined;
  if (!course) return message;

  let where = `Course "${String(course.title ?? `#${Number(path[0]) + 1}`)}"`;
  if (path[1] === "modules" && typeof path[2] === "number") {
    const courseModule = course.modules?.[path[2]];
    where += `, module "${String(courseModule?.title ?? `#${path[2] + 1}`)}"`;
    if (path[3] === "lessons" && typeof path[4] === "number") {
      where += `, lesson "${String(courseModule?.lessons?.[path[4]]?.title ?? `#${path[4] + 1}`)}"`;
    }
  }
  return `${where}: ${message}`;
}

/** Validates already-structured course data (used directly by the server on what the browser sends). */
export function validateCourseImport(raw: unknown): CourseImportParseResult {
  const result = courseImportSchema.safeParse(raw);
  if (result.success) return { courses: result.data, errors: [] };
  return {
    courses: [],
    errors: result.error.issues.slice(0, 20).map((issue) => describeIssue(raw, issue.path, issue.message)),
  };
}

/** Parses and validates a dropped file. `.json` is read as JSON, anything else as CSV. */
export function parseCourseImportFile(text: string, fileName: string): CourseImportParseResult {
  try {
    const raw = fileName.toLowerCase().endsWith(".json") ? coursesFromJson(text) : coursesFromCsv(text);
    return validateCourseImport(raw);
  } catch (error) {
    return { courses: [], errors: [error instanceof Error ? error.message : "The file could not be read"] };
  }
}
