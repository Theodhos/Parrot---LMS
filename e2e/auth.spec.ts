import { test, expect } from "@playwright/test";

test.describe("authentication", () => {
  test("unauthenticated visitors are redirected away from protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("signs in with WordPress-backed credentials and reaches the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@parrot.dev");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/welcome back, alice/i)).toBeVisible();
  });

  test("rejects an incorrect password with a visible error, no redirect", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@parrot.dev");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin and instructor route groups are gated by role", async ({ page }) => {
    // A STUDENT should never reach /admin -- middleware bounces them to /dashboard.
    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@parrot.dev");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
