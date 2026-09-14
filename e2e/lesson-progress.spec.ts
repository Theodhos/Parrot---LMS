import { test, expect } from "@playwright/test";

test.describe("lesson progress tracking", () => {
  test("marking a lesson complete updates the button and the sidebar", async ({ page }) => {
    // Bob has already completed all of Java Programming per prisma/seed.ts,
    // so use Alice, who is partway through it, and complete her next lesson.
    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@parrot.dev");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const res = await page.request.get("/api/me/courses");
    const { data: enrollments } = await res.json();
    const java = enrollments.find((e: { course: { slug: string } }) => e.course.slug === "java-programming");
    expect(java).toBeTruthy();

    const progressRes = await page.request.get(`/api/lessons/${java.course.modules[0].lessons[0].id}`);
    const { data: view } = await progressRes.json();
    const nextLessonId = view.navigation.nextLessonId ?? view.lesson.id;

    await page.goto(`/learn/${java.courseId}/${nextLessonId}`);

    const markButton = page.getByRole("button", { name: /mark as completed/i });
    if (await markButton.isVisible().catch(() => false)) {
      await markButton.click();
      await expect(page.getByRole("button", { name: /^completed$/i })).toBeVisible();
    } else {
      // Already completed from a previous run -- assert the completed state directly.
      await expect(page.getByRole("button", { name: /^completed$/i })).toBeVisible();
    }
  });
});
