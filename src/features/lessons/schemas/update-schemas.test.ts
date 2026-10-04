import { describe, expect, it } from "vitest";
import { createLessonSchema, updateLessonSchema } from "./lesson.schema";
import { createCourseSchema, updateCourseSchema } from "@/features/courses/schemas/course.schema";

/** A partial update must change only what it names. */
describe("update schemas leave unmentioned fields alone", () => {
  it("toggling a lesson's published flag does not reset its type or duration", () => {
    expect(updateLessonSchema.parse({ published: true })).toEqual({ published: true });
    expect(updateLessonSchema.parse({ title: "Renamed" })).toEqual({ title: "Renamed" });
    expect(updateLessonSchema.parse({})).toEqual({});
  });

  it("a course update that does not mention the level does not reset it", () => {
    expect(updateCourseSchema.parse({ title: "Only the title" })).toEqual({ title: "Only the title" });
  });

  it("creation still fills in the defaults", () => {
    expect(createLessonSchema.parse({ title: "New lesson" })).toMatchObject({
      type: "ARTICLE",
      duration: 0,
      published: false,
    });
    expect(createCourseSchema.parse({ title: "New course", description: "Long enough description" })).toMatchObject({
      level: "BEGINNER",
    });
  });
});
