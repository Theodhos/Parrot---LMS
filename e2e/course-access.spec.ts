import { test, expect } from "@playwright/test";

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("purchase-gated course access", () => {
  test("shows Buy CTA for a course the student hasn't purchased, Continue for one they have", async ({ page }) => {
    // Per prisma/seed.ts: carol only purchased Modern Web Development.
    await loginAs(page, "carol@parrot.dev");

    await page.goto("/courses/java-programming");
    await expect(page.getByRole("link", { name: /buy this course/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /continue learning/i })).not.toBeVisible();

    await page.goto("/courses/modern-web-development");
    await expect(page.getByRole("link", { name: /continue learning/i })).toBeVisible();
  });

  test("cannot open a lesson from a course that hasn't been purchased, even via direct URL", async ({ page }) => {
    await loginAs(page, "carol@parrot.dev");

    const res = await page.request.get("/api/courses/java-programming");
    const { data: course } = await res.json();
    const lessonId = course.modules[0].lessons[0].id;

    await page.goto(`/learn/${course.id}/${lessonId}`);
    // The learn page redirects ForbiddenError straight to /dashboard rather
    // than exposing any protected lesson content.
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
