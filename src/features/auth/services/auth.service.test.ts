import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { recordFirstLogin, registerUser, verifyCredentials } from "./auth.service";
import { ConflictError, UnauthorizedError } from "@/lib/errors/app-error";

describe("auth.service (local MongoDB-backed)", () => {
  const email = `auth-test-${Date.now()}@test.local`;
  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("registers a new account with a hashed password and no wordpressUserId", async () => {
    const user = await registerUser({ name: "Auth Test", email, password: "Password123" });
    createdUserIds.push(user.id);

    expect(user.email).toBe(email.toLowerCase());
    expect(user.role).toBe("STUDENT");
    expect(user.wordpressUserId).toBeNull();

    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(record.password).not.toBeNull();
    expect(record.password).not.toBe("Password123");
  });

  it("rejects registering the same email twice", async () => {
    await expect(registerUser({ name: "Dup", email, password: "Password123" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("verifies correct credentials against the stored hash", async () => {
    const user = await verifyCredentials(email, "Password123");
    expect(user.email).toBe(email.toLowerCase());
  });

  it("rejects an incorrect password", async () => {
    await expect(verifyCredentials(email, "wrong-password")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("records the first login through the form once, and only for correct credentials", async () => {
    expect(await recordFirstLogin(email, "wrong-password")).toBeNull();
    expect(await recordFirstLogin("nobody-here@test.local", "whatever")).toBeNull();

    expect(await recordFirstLogin(email, "Password123")).toMatchObject({ id: createdUserIds[0], role: "STUDENT" });
    const record = await prisma.user.findUniqueOrThrow({ where: { id: createdUserIds[0] } });
    expect(record.firstLoginAt).toBeInstanceOf(Date);

    // Every later login is no longer the first.
    expect(await recordFirstLogin(email, "Password123")).toBeNull();
  });

  it("rejects a non-existent email", async () => {
    await expect(verifyCredentials("nobody-here@test.local", "whatever")).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
