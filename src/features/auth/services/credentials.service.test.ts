import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { generateTemporaryPassword, generateUniqueUsername } from "./credentials.service";

describe("generateTemporaryPassword", () => {
  it("meets length and character-class requirements on every draw", () => {
    for (let i = 0; i < 50; i++) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(14);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*\-_?]/);
    }
  });

  it("does not repeat", () => {
    const draws = new Set(Array.from({ length: 100 }, () => generateTemporaryPassword()));
    expect(draws.size).toBe(100);
  });
});

describe("generateUniqueUsername (local MongoDB-backed)", () => {
  const stamp = Date.now();
  // Short enough to survive the 20-char base truncation, so the generator's
  // first (bare-base) candidate really collides with it.
  const takenUsername = `taken${stamp % 1_000_000}`;
  let takenUserId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: "Taken", email: `username-taken-${stamp}@test.local`, username: takenUsername },
    });
    takenUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: takenUserId } });
  });

  it("derives a friendly lowercase handle from the name", async () => {
    const username = await generateUniqueUsername(`fresh-${stamp}@test.local`, "John Smith");
    expect(username).toMatch(/^john\.smith(\d{4})?$/);
  });

  it("falls back to the email local part and strips unsafe characters", async () => {
    const username = await generateUniqueUsername(`Árben_Hoxha-${stamp}@test.local`, undefined);
    expect(username).toMatch(/^[a-z0-9.]+(\d{4})?$/);
  });

  it("resolves collisions with a random numeric suffix", async () => {
    const username = await generateUniqueUsername(`other-${stamp}@test.local`, takenUsername);
    expect(username).not.toBe(takenUsername);
    expect(username).toMatch(new RegExp(`^${takenUsername}\\d{4}$`));
  });
});
