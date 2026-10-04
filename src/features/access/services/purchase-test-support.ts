import { vi } from "vitest";
import { prisma } from "@/lib/db/client";

/**
 * Test support. A purchase enrolls the buyer into every published course,
 * and the test database is shared with test files running in parallel, each
 * with its own short-lived published courses. This narrows every
 * `prisma.course.findMany` in the calling file to the courses that file
 * created, so a test purchase never reaches into another file's data (which
 * would also break that file's cleanup). `asked` records the filters the
 * code under test actually requested, before narrowing.
 */
export function scopeCourseQueriesTo(ownCourseIds: () => string[]) {
  const realFindMany = prisma.course.findMany.bind(prisma.course);
  const asked: { where?: Record<string, unknown> }[] = [];
  const spy = vi.spyOn(prisma.course, "findMany").mockImplementation(((args: { where?: Record<string, unknown> }) => {
    asked.push(args);
    return realFindMany({ ...args, where: { ...args?.where, id: { in: ownCourseIds() } } } as never);
  }) as never);
  return { asked, restore: () => spy.mockRestore() };
}
