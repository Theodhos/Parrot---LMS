import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { WelcomeForm } from "./welcome-form";

interface WelcomePageProps {
  searchParams: Promise<{ email?: string; next?: string }>;
}

/**
 * Where GoHighLevel sends a buyer straight after checkout: they choose their
 * username and password here, with no emailed link in between. An `email`
 * query parameter (when the checkout passes one) only pre-fills the field.
 * `next=course` is set on the redirect of a checkout whose buyers should go
 * straight into the course afterwards instead of seeing the offer page.
 */
export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  // A returning customer who is already signed in has nothing to set up.
  if (await getCurrentUser()) redirect("/dashboard");

  const { email, next } = await searchParams;

  return (
    <div className="rounded-[2rem] border border-[#f3ecd7] bg-white p-7 shadow-[0_24px_60px_-28px_rgba(62,52,31,0.3)] sm:p-10">
      <span className="inline-flex items-center rounded-full bg-[#f3f9ea] px-3 py-1 text-[11px] font-bold tracking-widest text-[#5b7a34] uppercase ring-1 ring-[#d5e8bb]">
        Welcome aboard
      </span>
      <h1 className="font-heading mt-4 text-3xl font-bold text-[#1f1737] sm:text-4xl">Create your login</h1>
      <p className="mt-2 text-base font-medium text-[#6D5D3B]">
        Thank you for your purchase! Enter the email you used at checkout, then choose a username and password
        to open your course.
      </p>

      <div className="mt-8">
        <WelcomeForm
          defaultEmail={typeof email === "string" ? email : ""}
          next={typeof next === "string" ? next : ""}
        />
      </div>

      <p className="mt-6 text-center text-sm font-medium text-[#6D5D3B]">
        Already created your login?{" "}
        <Link href="/login" className="font-bold text-[#FF5757] underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
