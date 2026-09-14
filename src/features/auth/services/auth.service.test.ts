import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { registerUser, verifyCredentials } from "./auth.service";
import { ConflictError, UnauthorizedError } from "@/lib/errors/app-error";

describe("auth.service", () => {
  const email = `auth-test-${Date.now()}@test.local`;
  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("registers a new user with a hashed password and STUDENT role", async () => {
    const user = await registerUser({ name: "Auth Test", email, password: "Password123" });
    createdUserIds.push(user.id);

    expect(user.email).toBe(email.toLowerCase());
    expect(user.role).toBe("STUDENT");

    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(record.passwordHash).not.toBe("Password123");
    expect(record.passwordHash).toBeTruthy();
  });

  it("rejects registering the same email twice", async () => {
    await expect(registerUser({ name: "Dup", email, password: "Password123" })).rejects.toBeInstanceOf(ConflictError);
  });

  it("verifies correct credentials", async () => {
    const user = await verifyCredentials(email, "Password123");
    expect(user.email).toBe(email.toLowerCase());
  });

  it("rejects an incorrect password", async () => {
    await expect(verifyCredentials(email, "wrong-password")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a non-existent email", async () => {
    await expect(verifyCredentials("nobody-here@test.local", "whatever")).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
