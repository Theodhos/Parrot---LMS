import { describe, expect, it } from "vitest";
import { COURSE_IMPORT_CSV_TEMPLATE, parseCourseImportFile, parseCsv } from "./course-import";

describe("parseCsv", () => {
  it("handles quoted fields with commas, doubled quotes and line breaks", () => {
    const rows = parseCsv('a,b\r\n"one, two","say ""hi"""\n"line 1\nline 2",x\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["one, two", 'say "hi"'],
      ["line 1\nline 2", "x"],
    ]);
  });

  it("detects the semicolon delimiter Excel uses in European locales, and skips a BOM and blank lines", () => {
    expect(parseCsv("﻿a;b\n\n1;2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCourseImportFile", () => {
  it("groups the CSV template's rows into courses, modules and lessons", () => {
    const { courses, errors } = parseCourseImportFile(COURSE_IMPORT_CSV_TEMPLATE, "courses.csv");

    expect(errors).toEqual([]);
    expect(courses.map((c) => c.title)).toEqual(["Parrot Talking Basics", "Advanced Tricks"]);

    const basics = courses[0]!;
    expect(basics).toMatchObject({ level: "BEGINNER", price: 49 });
    expect(basics.description).toBe("Teach your parrot its first words, step by step.");
    expect(basics.modules.map((m) => [m.title, m.lessons.length])).toEqual([
      ["Getting started", 2],
      ["Daily practice", 1],
    ]);
    expect(basics.modules[0]!.lessons[0]).toMatchObject({
      title: "Welcome",
      type: "VIDEO",
      videoUrl: "https://www.youtube.com/watch?v=eIrMbAQSU34",
      duration: 300,
      description: "What this course covers",
    });
    expect(courses[1]).toMatchObject({ level: "ADVANCED", price: 79 });
  });

  it("accepts column names in any order and case, and defaults what is left out", () => {
    const csv = ["Lesson_Title;COURSE_TITLE;course_description", "Intro;My Course;A description long enough"].join("\n");
    const { courses, errors } = parseCourseImportFile(csv, "x.csv");

    expect(errors).toEqual([]);
    expect(courses[0]).toMatchObject({ title: "My Course", level: "BEGINNER", price: 0 });
    // A lesson with no module_title lands in a default module.
    expect(courses[0]!.modules).toMatchObject([{ title: "Lessons", lessons: [{ title: "Intro", type: "VIDEO", duration: 0 }] }]);
  });

  it("reads JSON, as a list or wrapped in { courses }", () => {
    const course = {
      title: "JSON Course",
      description: "A description long enough",
      modules: [{ title: "Module A", lessons: [{ title: "Lesson 1", type: "ARTICLE", content: "<p>Hi</p>" }] }],
    };
    for (const text of [JSON.stringify([course]), JSON.stringify({ courses: [course] })]) {
      const { courses, errors } = parseCourseImportFile(text, "courses.json");
      expect(errors).toEqual([]);
      expect(courses[0]!.modules[0]!.lessons[0]).toMatchObject({ title: "Lesson 1", type: "ARTICLE" });
    }
  });

  it("reports problems by course, module and lesson name, and imports nothing", () => {
    const csv = [
      "course_title,course_description,level,module_title,lesson_title,video_url",
      "Good Course,A description long enough,BEGINNER,Mod,Lesson,not-a-link",
      "Bad Course,short,EXPERT,Mod,Lesson,",
    ].join("\n");
    const { courses, errors } = parseCourseImportFile(csv, "x.csv");

    expect(courses).toEqual([]);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Course "Good Course", module "Mod", lesson "Lesson": Video URL must be a full link/),
        expect.stringMatching(/^Course "Bad Course": Course description must be at least 10 characters/),
      ]),
    );
    expect(errors.some((e) => e.startsWith('Course "Bad Course":') && /level|EXPERT|option/i.test(e))).toBe(true);
  });

  it("explains an unusable file instead of throwing", () => {
    expect(parseCourseImportFile("", "x.csv").errors).toEqual(["The file is empty"]);
    expect(parseCourseImportFile("name,price\nx,1", "x.csv").errors[0]).toMatch(/course_title/);
    expect(parseCourseImportFile("{oops", "x.json").errors).toEqual(["The file is not valid JSON"]);
    expect(parseCourseImportFile("course_title\n", "x.csv").errors).toEqual(["The file contains no courses"]);
  });
});
