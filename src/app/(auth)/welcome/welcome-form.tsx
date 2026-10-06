"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail, UserRound } from "lucide-react";
import { claimAccountAfterCheckoutAction, type ClaimActionState } from "@/features/auth/actions/activate.actions";

// The checkout redirect can land here before the purchase webhook does, so a
// "no purchase yet" answer is retried for a while before it is shown as an error.
const PAYMENT_RETRY_INTERVAL_MS = 3000;
const PAYMENT_WAIT_MS = 60_000;

const labelClassName = "text-sm font-bold text-[#3E341F]";
const fieldClassName =
  "h-12 w-full rounded-2xl border border-[#eadfc6] bg-[#FDFCF8] pl-11 text-base font-medium text-[#1f1737] outline-none transition-[border-color,box-shadow,background-color] placeholder:font-normal placeholder:text-[#b3a78c] hover:border-[#d9cba9] focus-visible:border-[#FF6B6B] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#FF6B6B]/15";
const fieldIconClassName =
  "pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#a8997a] transition-colors group-focus-within:text-[#FF5757]";
const fieldErrorClassName = "text-xs font-medium text-[#c53030]";

export function WelcomeForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, setState] = useState<ClaimActionState>({ error: null });
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const deadline = Date.now() + PAYMENT_WAIT_MS;
      try {
        for (;;) {
          // On success the action signs the buyer in and redirects to the dashboard.
          const result = await claimAccountAfterCheckoutAction(formData);
          if (!result.awaitingPayment) {
            setState(result);
            return;
          }
          if (Date.now() >= deadline) {
            setState({
              error:
                "We couldn't find a purchase for this email yet. Check that it is the email you used at checkout, then try again in a minute.",
            });
            return;
          }
          setConfirmingPayment(true);
          await new Promise((resolve) => setTimeout(resolve, PAYMENT_RETRY_INTERVAL_MS));
        }
      } finally {
        setConfirmingPayment(false);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          Email used at checkout
        </label>
        <div className="group relative">
          <Mail className={fieldIconClassName} />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            defaultValue={defaultEmail}
            required
            className={`${fieldClassName} pr-4`}
          />
        </div>
        {state.fieldErrors?.email && <p className={fieldErrorClassName}>{state.fieldErrors.email[0]}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className={labelClassName}>
          Username
        </label>
        <div className="group relative">
          <UserRound className={fieldIconClassName} />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Choose a username"
            required
            minLength={3}
            maxLength={30}
            className={`${fieldClassName} pr-4`}
          />
        </div>
        {state.fieldErrors?.username && <p className={fieldErrorClassName}>{state.fieldErrors.username[0]}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={labelClassName}>
          Password
        </label>
        <div className="group relative">
          <Lock className={fieldIconClassName} />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Choose a password"
            required
            minLength={8}
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
        {state.fieldErrors?.password ? (
          <p className={fieldErrorClassName}>{state.fieldErrors.password[0]}</p>
        ) : (
          <p className="text-xs font-medium text-[#8a7b5c]">
            At least 8 characters, with an uppercase letter, a lowercase letter and a number.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="group/submit mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF6B6B] text-base font-bold text-white shadow-[0_12px_24px_-12px_rgba(255,87,87,0.8)] transition-all outline-none hover:bg-[#ff5555] focus-visible:ring-4 focus-visible:ring-[#FF6B6B]/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            {confirmingPayment ? "Confirming your payment..." : "Creating your login..."}
          </>
        ) : (
          <>
            Create login &amp; start learning
            <ArrowRight className="size-4 transition-transform group-hover/submit:translate-x-0.5" />
          </>
        )}
      </button>

      {confirmingPayment && (
        <p role="status" className="text-center text-sm font-medium text-[#6D5D3B]">
          Your payment is still being confirmed. This usually takes a few seconds &mdash; please keep this page
          open.
        </p>
      )}
    </form>
  );
}
