import "server-only";
import { prisma } from "@/lib/db/client";
import { findUserByLogin } from "@/features/auth/services/auth.service";
import { createPasswordSetupToken } from "@/features/auth/services/activation.service";
import { GHL_TAGS } from "@/features/access/services/gohighlevel.service";
import { emailLinkThroughGhl } from "@/features/access/services/ghl-email-handoff";

const RESET_LINK_TTL_HOURS = 2;
const REQUEST_COOLDOWN_MS = 2 * 60 * 1000;

/**
 * Forgot-password: emails the account's owner a single-use link to choose a
 * new password, delivered by GoHighLevel like every other email. Resolves
 * the same way whether or not the account exists, so the form cannot be used
 * to discover which emails or usernames are registered -- callers must show
 * the same message either way.
 *
 * An account that never finished setup (no password yet) gets its
 * account-setup link again instead, since it still has no username.
 */
export async function requestPasswordReset(identifier: string, siteUrl: string): Promise<void> {
  const user = await findUserByLogin(identifier);
  if (!user) return;

  // One email per couple of minutes per account: repeated submits must not
  // flood the inbox or pile up live links.
  const recent = await prisma.passwordSetupToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - REQUEST_COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) return;

  // The buyer's GoHighLevel contact is the one their purchase came from.
  const payment = await prisma.payment.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { ghlContactId: true, ghlLocationId: true },
  });
  const hasPassword = Boolean(user.password);

  await emailLinkThroughGhl({
    user,
    contact: {
      contactId: payment?.ghlContactId ?? undefined,
      locationId: payment?.ghlLocationId ?? undefined,
      email: user.email,
    },
    // Always the password-reset workflow, also for a setup link: the
    // credentials-ready one fires on every purchase and may be switched off
    // now that buyers set up their login on /welcome straight after checkout.
    tag: GHL_TAGS.passwordReset,
    buildLink: async () =>
      hasPassword
        ? `${siteUrl}/reset-password?token=${await createPasswordSetupToken(user.id, RESET_LINK_TTL_HOURS)}`
        : `${siteUrl}/activate?token=${await createPasswordSetupToken(user.id)}`,
  });
}
