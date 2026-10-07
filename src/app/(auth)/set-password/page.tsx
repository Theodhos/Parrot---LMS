import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { WelcomeForm } from "../welcome/welcome-form";

interface SetPasswordPageProps {
  searchParams: Promise<{ email?: string }>;
}

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * The password page for members registered by the "webhook from js"
 * automation in GoHighLevel. Their email and username are already stored by
 * the contact webhook, and the email arrives with the link GoHighLevel sends
 * them (`?email={{contact.email}}`), so the page asks for the password only.
 * Afterwards the member is signed in and goes on to /login-upsell-thank-you.
 */
export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const { email } = await searchParams;
  const memberEmail = typeof email === "string" && looksLikeEmail(email) ? email.trim() : null;

  return (
    <div className="rounded-[2rem] border border-[#f3ecd7] bg-white p-7 shadow-[0_24px_60px_-28px_rgba(62,52,31,0.3)] sm:p-10">
      <span className="inline-flex items-center rounded-full bg-[#f3f9ea] px-3 py-1 text-[11px] font-bold tracking-widest text-[#5b7a34] uppercase ring-1 ring-[#d5e8bb]">
        Welcome aboard
      </span>
      <h1 className="font-heading mt-4 text-3xl font-bold text-[#1f1737] sm:text-4xl">Create your password</h1>

      {memberEmail ? (
        <>
          <p className="mt-2 text-base font-medium text-[#6D5D3B]">
            Your account for <strong className="text-[#3E341F]">{memberEmail}</strong> is ready. Choose a password
            to continue.
          </p>
          <div className="mt-8">
            <WelcomeForm flow="invite" defaultEmail={memberEmail} next="upsell" lockedEmail />
          </div>
        </>
      ) : (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-2xl border border-[#fcd5d5] bg-[#fff8f8] px-4 py-3 text-sm font-medium text-[#c53030]"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            This page needs to be opened from the link you received, which tells us who you are. Please use that
            link, or contact support.
          </span>
        </div>
      )}

      <p className="mt-6 text-center text-sm font-medium text-[#6D5D3B]">
        Already created your password?{" "}
        <Link href="/login" className="font-bold text-[#FF5757] underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
