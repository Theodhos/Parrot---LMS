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

    // Note: these render as real <a> tags (see enroll-form.tsx / the
    // "Continue learning" Button render={<Link/>} usage), but the shared
    // Button component (Base UI) always reports role="button" to
    // accessibility tools regardless of the underlying tag it renders as.
    await page.goto("/courses/java-programming");
    await expect(page.getByRole("button", { name: /buy this course/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue learning/i })).not.toBeVisible();

    await page.goto("/courses/modern-web-development");
    await expect(page.getByRole("button", { name: /continue learning/i })).toBeVisible();
  });

  test("cannot open a lesson from a course that hasn't been purchased, even via direct URL", async ({ page }) => {
    await loginAs(page, "carol@parrot.dev");

    const res = await page.request.get("/api/courses/java-programming");
    const { data: course } = await res.json();
    const lessonId = course.modules[0].lessons[0].id;

    await page.goto(`/courses/${course.slug}?lesson=${lessonId}`);
    // Without an enrollment the ?lesson= query is ignored entirely -- the page
    // falls back to the purchase-gated course landing view, never the player.
    await expect(page).toHaveURL(`/courses/${course.slug}?lesson=${lessonId}`);
    await expect(page.getByRole("button", { name: /buy this course/i })).toBeVisible();
  });
});
