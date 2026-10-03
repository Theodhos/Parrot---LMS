import "server-only";
import { prisma } from "@/lib/db/client";
import { EmailStatus } from "@/generated/prisma";
import {
  ACCESS_LINK_FIELD_KEY,
  addContactTag,
  setContactCustomFields,
  type GhlContactRef,
} from "@/features/access/services/gohighlevel.service";

/**
 * Hands a personal link to GoHighLevel, which owns email delivery: writes it
 * onto the contact's course_login_url custom field FIRST, then adds the tag
 * that fires the matching GHL email workflow. Order matters -- the tag must
 * never fire before the field it merges is in place. `buildLink` runs inside
 * the guarded block so a failure to mint the link is recorded like any other
 * failed handoff. The attempt is an EmailLog row (SENT = handed off to GHL,
 * FAILED = nothing was emailed); it never throws. The link is a credential
 * until used, so it is never logged.
 */
export async function emailLinkThroughGhl(input: {
  user: { id: string; email: string };
  contact: GhlContactRef;
  tag: string;
  buildLink: () => Promise<string> | string;
  paymentId?: string;
}): Promise<EmailStatus> {
  const { user, contact, tag, buildLink, paymentId } = input;

  const log = await prisma.emailLog.create({
    data: {
      to: user.email,
      subject: `GoHighLevel email workflow (tag: ${tag})`,
      status: EmailStatus.PENDING,
      userId: user.id,
      paymentId,
    },
  });

  try {
    const contactId = await setContactCustomFields(contact, { [ACCESS_LINK_FIELD_KEY]: await buildLink() });
    await addContactTag(contactId, tag);

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: EmailStatus.SENT, sentAt: new Date(), error: null },
    });
    console.info(`[gohighlevel] link handed to GHL contact ${contactId}, tag "${tag}" added`);
    return EmailStatus.SENT;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.emailLog
      .update({ where: { id: log.id }, data: { status: EmailStatus.FAILED, error: message } })
      .catch(() => {});
    console.error(`[gohighlevel] link handoff to GHL FAILED for ${user.email} (tag "${tag}"): ${message}`);
    return EmailStatus.FAILED;
  }
}
