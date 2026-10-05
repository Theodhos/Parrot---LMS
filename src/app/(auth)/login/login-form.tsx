"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, Lock, UserRound } from "lucide-react";
import { loginAction, type LoginActionState } from "@/features/auth/actions/auth.actions";

const initialState: LoginActionState = { error: null };

const labelClassName = "text-sm font-bold text-[#3E341F]";
const fieldClassName =
  "h-12 w-full rounded-2xl border border-[#eadfc6] bg-[#FDFCF8] pl-11 text-base font-medium text-[#1f1737] outline-none transition-[border-color,box-shadow,background-color] placeholder:font-normal placeholder:text-[#b3a78c] hover:border-[#d9cba9] focus-visible:border-[#FF6B6B] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#FF6B6B]/15";
const fieldIconClassName =
  "pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#a8997a] transition-colors group-focus-within:text-[#FF5757]";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-[#fcd5d5] bg-[#fff8f8] px-4 py-3 text-sm font-medium text-[#c53030]"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelClassName}>
          Email or username
        </label>
        <div className="group relative">
          <UserRound className={fieldIconClassName} />
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            required
            className={`${fieldClassName} pr-4`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className={labelClassName}>
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-bold text-[#FF5757] underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="group relative">
          <Lock className={fieldIconClassName} />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            required
            className={`${fieldClassName} pr-12`}
          />
          {/* Labelled without the word "password" so the field stays the only match for that label. */}
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide characters" : "Show characters"}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-[#a8997a] transition-colors outline-none hover:bg-[#FCF6ED] hover:text-[#3E341F] focus-visible:ring-4 focus-visible:ring-[#FF6B6B]/15"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="group/submit mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF6B6B] text-base font-bold text-white shadow-[0_12px_24px_-12px_rgba(255,87,87,0.8)] transition-all outline-none hover:bg-[#ff5555] focus-visible:ring-4 focus-visible:ring-[#FF6B6B]/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="size-4 transition-transform group-hover/submit:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
