import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import { requestPasswordReset } from "./password-reset.service";
import { resetPasswordFromToken } from "./activation.service";
import { verifyCredentials } from "./auth.service";

interface GhlCall {
  path: string;
  body: { customFields?: { key: string; field_value: string }[]; tags?: string[] };
}

describe("password reset (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const email = `reset-test-${stamp}@test.local`;
  const username = `reset-${stamp}`;
  const siteUrl = "https://lms.test.local";
  let userId: string;
  const savedGhlToken = process.env.GHL_API_TOKEN;

  // Stand-in for the GoHighLevel API: records every call, never leaves the process.
  const ghlCalls: GhlCall[] = [];
  const linkSentToGhl = () =>
    ghlCalls.flatMap((c) => c.body.customFields ?? []).find((f) => f.key === "course_login_url")?.field_value;
  // Lets the next request through the per-account cooldown.
  const ageTokens = () =>
    prisma.passwordSetupToken.updateMany({
      where: { userId },
      data: { createdAt: new Date(Date.now() - 10 * 60 * 1000) },
    });

  beforeAll(async () => {
    process.env.GHL_API_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init: RequestInit) => {
        ghlCalls.push({ path: new URL(String(url)).pathname, body: JSON.parse(String(init.body)) });
        return Response.json({ contact: { id: "contact-reset" } });
      }),
    );

    const user = await prisma.user.create({
      data: { name: "Reset Tester", email, username, password: await bcrypt.hash("OldPass123", 10) },
    });
    userId = user.id;
    await prisma.payment.create({
      data: { userId, ghlTransactionId: `txn-reset-${stamp}`, ghlContactId: "contact-reset", courseSlugs: [] },
    });
  });

  beforeEach(() => {
    ghlCalls.length = 0;
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    if (savedGhlToken === undefined) delete process.env.GHL_API_TOKEN;
    else process.env.GHL_API_TOKEN = savedGhlToken;
    await prisma.emailLog.deleteMany({ where: { userId } });
    await prisma.payment.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("does nothing, and does not fail, for an account that does not exist", async () => {
    await expect(requestPasswordReset(`nobody-${stamp}@test.local`, siteUrl)).resolves.toBeUndefined();
    expect(ghlCalls).toHaveLength(0);
  });

  it("hands GoHighLevel a reset link on the buyer's contact, by email or by username", async () => {
    await requestPasswordReset(email, siteUrl);

    expect(ghlCalls.map((c) => c.path)).toEqual(["/contacts/contact-reset", "/contacts/contact-reset/tags"]);
    expect(ghlCalls[1]!.body.tags).toEqual(["course-password-reset"]);
    expect(linkSentToGhl()).toMatch(/^https:\/\/lms\.test\.local\/reset-password\?token=[0-9a-f]{64}$/);

    await ageTokens();
    ghlCalls.length = 0;
    await requestPasswordReset(username, siteUrl);
    expect(linkSentToGhl()).toMatch(/\/reset-password\?token=/);
  });

  it("sends at most one email per cooldown window", async () => {
    await requestPasswordReset(email, siteUrl);
    expect(ghlCalls).toHaveLength(0);
  });

  it("replaces the password through the link, keeps the username, and kills every outstanding link", async () => {
    await ageTokens();
    await requestPasswordReset(email, siteUrl);
    const token = new URL(linkSentToGhl()!).searchParams.get("token")!;
    const olderTokens = await prisma.passwordSetupToken.findMany({
      where: { userId, token: { not: token } },
      select: { token: true },
    });
    expect(olderTokens.length).toBeGreaterThan(0);

    await resetPasswordFromToken(token, "BrandNew456");

    expect((await verifyCredentials(username, "BrandNew456")).email).toBe(email);
    await expect(verifyCredentials(username, "OldPass123")).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(resetPasswordFromToken(token, "Another789")).rejects.toBeInstanceOf(ValidationError);
    await expect(resetPasswordFromToken(olderTokens[0]!.token, "Another789")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("sends an account that never finished setup its setup link instead", async () => {
    await prisma.user.update({ where: { id: userId }, data: { password: null } });
    await ageTokens();

    await requestPasswordReset(email, siteUrl);

    expect(linkSentToGhl()).toMatch(/\/activate\?token=/);
    expect(ghlCalls[1]!.body.tags).toEqual(["course-credentials-ready"]);
  });
});
