import "server-only";
import { UnauthorizedError } from "@/lib/errors/app-error";

/**
 * Server-to-server client for the course-platform-bridge WordPress plugin
 * (wordpress-plugin/course-platform-bridge/ in this repo). WordPress owns
 * identity and passwords entirely -- this module is the ONLY place a
 * password is ever handled on the Next.js side, and it is forwarded
 * straight through over HTTPS to WordPress and never persisted, logged, or
 * echoed back. See section 3 of the integration spec.
 */

export interface WordPressProfile {
  wordpressUserId: number;
  email: string;
  name: string;
  roles: string[];
}

function config() {
  const baseUrl = process.env.WORDPRESS_URL;
  const apiKey = process.env.WORDPRESS_BRIDGE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("WORDPRESS_URL and WORDPRESS_BRIDGE_API_KEY must be configured");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

async function bridgeFetch(path: string, init?: RequestInit) {
  const { baseUrl, apiKey } = config();
  return fetch(`${baseUrl}/wp-json/course-platform/v1${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

/** Verifies email+password against WordPress. Never throws for bad credentials -- returns null. */
export async function wpLogin(email: string, password: string): Promise<WordPressProfile | null> {
  const res = await bridgeFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success) return null;

  return {
    wordpressUserId: json.wordpressUserId,
    email: json.email,
    name: json.name,
    roles: json.roles ?? [],
  };
}

/** Creates a new WordPress account. Throws UnauthorizedError-shaped AppError on failure (email taken, weak password, etc). */
export async function wpRegister(name: string, email: string, password: string): Promise<WordPressProfile> {
  const res = await bridgeFetch("/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new UnauthorizedError(json.message || "Could not create your account");
  }

  return {
    wordpressUserId: json.wordpressUserId,
    email: json.email,
    name: json.name,
    roles: json.roles ?? [],
  };
}

export async function wpGetCourseAccess(wordpressUserId: number, courseSlug: string) {
  const res = await bridgeFetch(`/courses/${encodeURIComponent(courseSlug)}/access?wordpressUserId=${wordpressUserId}`);
  if (!res.ok) return null;
  return res.json() as Promise<{ hasAccess: boolean; accessStatus: string }>;
}

export async function wpListMyCourses(wordpressUserId: number) {
  const res = await bridgeFetch(`/me/courses?wordpressUserId=${wordpressUserId}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.courses as { courseId: string; hasAccess: boolean; accessStatus: string }[];
}
