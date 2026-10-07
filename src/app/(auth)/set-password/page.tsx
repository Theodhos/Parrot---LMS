import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CreatePasswordCard } from "../create-password/create-password-card";

/** Where this page leads once the password is created: the funnel's offer page. */
const UPSELL_URL = "/login-upsell-thank-you";

interface SetPasswordPageProps {
  searchParams: Promise<{ email?: string }>;
}

/**
 * The create-password page for members registered by the "webhook from js"
 * automation in GoHighLevel: the same form as /create-password, but it leads
 * on to /login-upsell-thank-you instead of the free courses. A browser that
 * is already signed in goes there directly.
 */
export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  if (await getCurrentUser()) redirect(UPSELL_URL);

  const { email } = await searchParams;

  return <CreatePasswordCard defaultEmail={typeof email === "string" ? email : ""} next="upsell" />;
}
