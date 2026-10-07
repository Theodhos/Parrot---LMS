import { CreatePasswordCard } from "../create-password/create-password-card";

interface SetPasswordPageProps {
  searchParams: Promise<{ email?: string }>;
}

/**
 * The create-password page for members registered by the "webhook from js"
 * automation in GoHighLevel: the same form as /create-password, but it leads
 * on to /login-upsell-thank-you instead of the free courses. The form is
 * always shown -- even to a browser that is signed in as someone else --
 * so a member can always create their password here.
 */
export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const { email } = await searchParams;

  return <CreatePasswordCard defaultEmail={typeof email === "string" ? email : ""} next="upsell" />;
}
