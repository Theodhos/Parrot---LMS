import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { ConflictError, ValidationError } from "@/lib/errors/app-error";
import { activateAccountFromToken, createPasswordSetupToken, getPasswordSetupContext } from "./activation.service";
import { verifyCredentials } from "./auth.service";

describe("activation.service (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const email = `activation-test-${stamp}@test.local`;
  const username = `buyer-${stamp}`;
  const userIds: string[] = [];

  beforeAll(async () => {
    const buyer = await prisma.user.create({ data: { name: "Buyer", email, password: null } });
    const other = await prisma.user.create({
      data: { name: "Other", email: `activation-other-${stamp}@test.local`, password: null },
    });
    userIds.push(buyer.id, other.id);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("sets the username and password from a valid token, then consumes it", async () => {
    const token = await createPasswordSetupToken(userIds[0]!);
    expect(await getPasswordSetupContext(token)).toMatchObject({ email });

    await activateAccountFromToken(token, username, "Password123");

    expect(await getPasswordSetupContext(token)).toBeNull();
    await expect(activateAccountFromToken(token, username, "Password123")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("signs in with either the username or the email", async () => {
    expect((await verifyCredentials(username, "Password123")).email).toBe(email);
    expect((await verifyCredentials(email, "Password123")).email).toBe(email);
  });

  it("rejects a username another account already uses", async () => {
    const token = await createPasswordSetupToken(userIds[1]!);
    await expect(activateAccountFromToken(token, username, "Password123")).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
