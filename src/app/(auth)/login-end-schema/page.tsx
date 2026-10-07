import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "../login/login-form";

/** Where this sign-in leads: the funnel's thank-you page (see src/app/login-end-schema-thank-you). */
const THANK_YOU_URL = "/login-end-schema-thank-you";

/**
 * The sign-in step before the funnel's thank-you page. A browser that is
 * already signed in skips the form and goes straight to that page; anyone
 * else signs in here and is taken there.
 */
export default async function LoginEndSchemaPage() {
  if (await getCurrentUser()) redirect(THANK_YOU_URL);

  return (
    <div className="rounded-[2rem] border border-[#f3ecd7] bg-white p-7 shadow-[0_24px_60px_-28px_rgba(62,52,31,0.3)] sm:p-10">
      <span className="inline-flex items-center rounded-full bg-[#fff8f8] px-3 py-1 text-[11px] font-bold tracking-widest text-[#FF5757] uppercase ring-1 ring-[#fcd5d5]">
        Members only
      </span>
      <h1 className="font-heading mt-4 text-3xl font-bold text-[#1f1737] sm:text-4xl">Sign in to continue</h1>
      <p className="mt-2 text-base font-medium text-[#6D5D3B]">
        Enter your login details and we&apos;ll take you straight to the next step.
      </p>

      <div className="mt-8">
        <LoginForm callbackUrl={THANK_YOU_URL} />
      </div>
    </div>
  );
}
