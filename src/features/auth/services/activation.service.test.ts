import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { ConflictError, UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import {
  activateAccountFromToken,
  claimAccountAfterCheckout,
  createPasswordSetupToken,
  getPasswordSetupContext,
} from "./activation.service";
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

describe("claimAccountAfterCheckout (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const email = `claim-test-${stamp}@test.local`;
  const lateEmail = `claim-late-${stamp}@test.local`;
  const username = `claimer-${stamp}`;
  const userIds: string[] = [];

  const recordPayment = (userId: string, createdAt = new Date()) =>
    prisma.payment.create({
      data: { userId, ghlTransactionId: `claim-txn-${userId}-${stamp}`, courseSlugs: ["*"], createdAt },
    });

  beforeAll(async () => {
    const buyer = await prisma.user.create({ data: { name: "Buyer", email, password: null } });
    const lateBuyer = await prisma.user.create({ data: { name: "Late", email: lateEmail, password: null } });
    userIds.push(buyer.id, lateBuyer.id);
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("asks the caller to wait while no purchase is on record", async () => {
    expect(await claimAccountAfterCheckout(`nobody-${stamp}@test.local`, username, "Password123")).toEqual({
      status: "awaiting-payment",
    });
    // The account exists but its payment has not been recorded yet.
    expect(await claimAccountAfterCheckout(email, username, "Password123")).toEqual({
      status: "awaiting-payment",
    });
    await expect(verifyCredentials(email, "Password123")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("sets the buyer's own username and password once the purchase is recorded", async () => {
    await recordPayment(userIds[0]!);
    const emailedToken = await createPasswordSetupToken(userIds[0]!);

    expect(await claimAccountAfterCheckout(email, username, "Password123")).toEqual({ status: "claimed", email });

    expect((await verifyCredentials(username, "Password123")).email).toBe(email);
    // The setup link emailed for the same purchase is dead from here on.
    expect(await getPasswordSetupContext(emailedToken)).toBeNull();
  });

  it("refuses an account that already has a login", async () => {
    await expect(claimAccountAfterCheckout(email, `other-${stamp}`, "Hijacked123")).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect((await verifyCredentials(email, "Password123")).email).toBe(email);
  });

  it("refuses a username another account already uses, and a purchase older than 24 hours", async () => {
    const payment = await recordPayment(userIds[1]!);
    await expect(claimAccountAfterCheckout(lateEmail, username, "Password123")).rejects.toBeInstanceOf(
      ConflictError,
    );

    await prisma.payment.update({
      where: { id: payment.id },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });
    await expect(claimAccountAfterCheckout(lateEmail, `late-${stamp}`, "Password123")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
