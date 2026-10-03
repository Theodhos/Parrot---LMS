import "server-only";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

/**
 * Contact custom field the GoHighLevel email workflows merge as
 * {{contact.course_login_url}}: the buyer's personal account-setup link, or
 * the login page for an account that already has a password. Unique key
 * without the "contact." prefix, overridable when the sub-account's differs.
 */
export const ACCESS_LINK_FIELD_KEY = process.env.GHL_LOGIN_URL_FIELD_KEY || "course_login_url";

/** Tags that trigger the matching GoHighLevel email workflow. */
export const GHL_TAGS = {
  /** New buyer without a password -- workflow emails the link to create their username and password. */
  credentialsReady: process.env.GHL_CREDENTIALS_TAG || "course-credentials-ready",
  /** Repeat purchase on an account that keeps its password -- workflow emails a "course unlocked" notice. */
  accessGranted: process.env.GHL_ACCESS_GRANTED_TAG || "course-access-granted",
  /** Forgot-password request -- workflow emails the link to choose a new password. */
  passwordReset: process.env.GHL_PASSWORD_RESET_TAG || "course-password-reset",
} as const;

export interface GhlContactRef {
  contactId?: string;
  locationId?: string;
  email: string;
}

/**
 * Server-to-server client for the GoHighLevel (LeadConnector) API. Checkout,
 * payment AND the access email all live in GoHighLevel; the backend owns
 * identity (MongoDB, bcrypt) and pushes the buyer's access link onto their
 * GHL contact so the email workflow can merge it in. Responses are parsed,
 * never logged wholesale -- they can echo the custom fields back.
 */
async function ghlFetch(path: string, init: { method: string; body: unknown }): Promise<unknown> {
  const token = process.env.GHL_API_TOKEN;
  if (!token) {
    throw new Error("GHL_API_TOKEN is not configured");
  }

  const res = await fetch(`${GHL_API_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(init.body),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new Error(`GoHighLevel API ${init.method} ${path} failed with ${res.status}: ${detail}`);
  }
  return res.json();
}

function contactIdFrom(response: unknown): string | undefined {
  const contact = (response as { contact?: { id?: unknown } } | null)?.contact;
  return typeof contact?.id === "string" ? contact.id : undefined;
}

/**
 * Writes custom field values onto the buyer's GoHighLevel contact. Uses the
 * contact id from the webhook when there is one; otherwise upserts the
 * contact by email within the location. Returns the contact id so a tag can
 * be added next. Field VALUES never get logged -- a single-use setup link
 * is a credential until the buyer has used it.
 */
export async function setContactCustomFields(
  contact: GhlContactRef,
  fields: Record<string, string>,
): Promise<string> {
  const customFields = Object.entries(fields).map(([key, field_value]) => ({ key, field_value }));

  if (contact.contactId) {
    await ghlFetch(`/contacts/${encodeURIComponent(contact.contactId)}`, {
      method: "PUT",
      body: { customFields },
    });
    return contact.contactId;
  }

  const locationId = contact.locationId || process.env.GHL_LOCATION_ID;
  if (!locationId) {
    throw new Error("The webhook carried no contact_id and GHL_LOCATION_ID is not configured");
  }
  const response = await ghlFetch("/contacts/upsert", {
    method: "POST",
    body: { locationId, email: contact.email, customFields },
  });
  const contactId = contactIdFrom(response);
  if (!contactId) {
    throw new Error("GoHighLevel upsert returned no contact id");
  }
  return contactId;
}

/**
 * Adds a tag to the contact. Additive (POST /contacts/{id}/tags), never
 * replaces existing tags. Adding the tag is what fires the email workflow,
 * so it must happen only after the custom fields are in place.
 */
export async function addContactTag(contactId: string, tag: string): Promise<void> {
  await ghlFetch(`/contacts/${encodeURIComponent(contactId)}/tags`, {
    method: "POST",
    body: { tags: [tag] },
  });
}
