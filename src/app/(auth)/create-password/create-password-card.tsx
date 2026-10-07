import Link from "next/link";
import { WelcomeForm } from "../welcome/welcome-form";

export interface CreatePasswordCardProps {
  /** Pre-fills the email field (from the link's `email` query parameter). */
  defaultEmail: string;
  /** Where the member goes afterwards; see claimInvitedAccountAction for the allowed values. */
  next?: string;
}

/**
 * The create-password form for a free member GoHighLevel registered (the
 * contact webhook stored their email and username): they type that email
 * and choose only a password. Shared by /create-password and /set-password.
 */
export function CreatePasswordCard({ defaultEmail, next = "" }: CreatePasswordCardProps) {
  return (
    <div className="rounded-[2rem] border border-[#f3ecd7] bg-white p-7 shadow-[0_24px_60px_-28px_rgba(62,52,31,0.3)] sm:p-10">
      <span className="inline-flex items-center rounded-full bg-[#f3f9ea] px-3 py-1 text-[11px] font-bold tracking-widest text-[#5b7a34] uppercase ring-1 ring-[#d5e8bb]">
        Welcome aboard
      </span>
      <h1 className="font-heading mt-4 text-3xl font-bold text-[#1f1737] sm:text-4xl">Create your password</h1>
      <p className="mt-2 text-base font-medium text-[#6D5D3B]">
        Your account is ready. Enter the email you registered with and choose a password to continue.
      </p>

      <div className="mt-8">
        <WelcomeForm flow="invite" defaultEmail={defaultEmail} next={next} />
      </div>

      <p className="mt-6 text-center text-sm font-medium text-[#6D5D3B]">
        Already created your password?{" "}
        <Link href="/login" className="font-bold text-[#FF5757] underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
