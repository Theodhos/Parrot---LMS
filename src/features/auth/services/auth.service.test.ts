import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { registerUser, verifyCredentials } from "./auth.service";
import { UnauthorizedError } from "@/lib/errors/app-error";

/**
 * Integration test against the real local course-platform-bridge WordPress
 * instance (WORDPRESS_URL in .env) -- there is no local password store left
 * to test against directly, since WordPress is the only place a password is
 * ever checked. Requires the local WordPress dev server to be running.
 */
describe("auth.service (WordPress-backed)", () => {
  const email = `auth-test-${Date.now()}@test.local`;
  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("registers a new account in WordPress and mirrors a local profile with no password stored", async () => {
    const user = await registerUser({ name: "Auth Test", email, password: "Password123" });
    createdUserIds.push(user.id);

    expect(user.email).toBe(email.toLowerCase());
    expect(user.role).toBe("STUDENT");
    expect(user.wordpressUserId).toEqual(expect.any(Number));

    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(record).not.toHaveProperty("passwordHash");
    expect(record.wordpressUserId).toBe(user.wordpressUserId);
  });

  it("rejects registering the same email twice", async () => {
    await expect(registerUser({ name: "Dup", email, password: "Password123" })).rejects.toThrow();
  });

  it("verifies correct credentials against WordPress and syncs the local profile", async () => {
    const user = await verifyCredentials(email, "Password123");
    expect(user.email).toBe(email.toLowerCase());
    expect(user.wordpressUserId).toEqual(expect.any(Number));
  });

  it("rejects an incorrect password", async () => {
    await expect(verifyCredentials(email, "wrong-password")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a non-existent email", async () => {
    await expect(verifyCredentials("nobody-here@test.local", "whatever")).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
