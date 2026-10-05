import Link from "next/link";
import { MailCheck } from "lucide-react";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[2rem] border border-[#f3ecd7] bg-white p-7 shadow-[0_24px_60px_-28px_rgba(62,52,31,0.3)] sm:p-10">
        <span className="inline-flex items-center rounded-full bg-[#fff8f8] px-3 py-1 text-[11px] font-bold tracking-widest text-[#FF5757] uppercase ring-1 ring-[#fcd5d5]">
          Member sign in
        </span>
        <h1 className="font-heading mt-4 text-3xl font-bold text-[#1f1737] sm:text-4xl">Welcome back</h1>
        <p className="mt-2 text-base font-medium text-[#6D5D3B]">
          Sign in to pick up where you and your bird left off.
        </p>

        <div className="mt-8">
          <LoginForm callbackUrl={callbackUrl || ""} />
        </div>

        <p className="mt-8 text-center text-sm font-medium text-[#6D5D3B]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold text-[#FF5757] underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-3xl border border-[#f3ecd7] bg-[#FCF6ED] px-5 py-4">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFD97D] text-[#3E341F]">
          <MailCheck className="size-4" />
        </span>
        <p className="text-sm font-medium text-[#6D5D3B]">
          <span className="font-bold text-[#3E341F]">Just bought the course?</span> Open the link in your
          purchase email to choose your username and password first.
        </p>
      </div>
    </div>
  );
}
