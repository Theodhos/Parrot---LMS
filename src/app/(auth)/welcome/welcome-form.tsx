"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  UserRound,
} from "lucide-react";
import {
  checkCheckoutEmailAction,
  checkInviteEmailAction,
  claimAccountAfterCheckoutAction,
  claimInvitedAccountAction,
  type ClaimActionState,
} from "@/features/auth/actions/activate.actions";

// The redirect from GoHighLevel can land here before its webhook does. For
// the first minute after the page opens, "nothing on record" therefore reads
// as "still on its way". After that it is reported at once, while the page
// keeps re-checking quietly in case the webhook is unusually late.
const WEBHOOK_GRACE_MS = 60_000;
const RECHECK_INTERVAL_MS = 3000;
const LATE_RECHECK_INTERVAL_MS = 6000;
const STOP_RECHECKING_AFTER_MS = 5 * 60_000;
const TYPING_PAUSE_MS = 500;

/**
 * The two ways a login is set up without an emailed link. After a purchase
 * (/welcome) the buyer chooses a username and a password; a free member
 * GoHighLevel registered (/create-password) already has a username and
 * chooses only the password. Everything else about the form is the same.
 */
const FLOWS = {
  checkout: {
    check: checkCheckoutEmailAction,
    claim: claimAccountAfterCheckoutAction,
    asksUsername: true,
    copy: {
      emailLabel: "Email used at checkout",
      emailHint: "Must be the same email you entered at checkout — a different one cannot create a login.",
      checking: "Checking this email against your purchase...",
      waiting: "Looking for your purchase... right after checkout this can take a few seconds.",
      ready: "Purchase found. Now choose your username and password.",
      notFound: "No purchase found for this email. Enter the exact email you used at checkout.",
      expired: "This page works for 24 hours after a purchase.",
      submit: "Create login & start learning",
      submitting: "Creating your login...",
      confirming: "Confirming your payment...",
      confirmingNote: "Your payment is still being confirmed. This usually takes a few seconds — please keep this page open.",
    },
  },
  invite: {
    check: checkInviteEmailAction,
    claim: claimInvitedAccountAction,
    asksUsername: false,
    copy: {
      emailLabel: "Your email",
      emailHint: "Must be the same email you registered with — a different one cannot create a password.",
      checking: "Checking this email against your registration...",
      waiting: "Looking for your registration... right after signing up this can take a few seconds.",
      ready: "Registration found. Now choose your password.",
      notFound: "No registration found for this email. Enter the exact email you registered with.",
      expired: "This page works for 7 days after you register.",
      submit: "Create password & start learning",
      submitting: "Creating your password...",
      confirming: "Confirming your registration...",
      confirmingNote:
        "Your registration is still being confirmed. This usually takes a few seconds — please keep this page open.",
    },
  },
} as const;

export type SetupFlow = keyof typeof FLOWS;

/**
 * How the typed email stands against what is on record: verified as soon as
 * it is typed, so the visitor knows before choosing a password.
 */
type EmailCheck = "idle" | "checking" | "waiting" | "ready" | "not-found" | "already-set-up" | "expired";

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const labelClassName = "text-sm font-bold text-[#3E341F]";
const fieldClassName =
  "h-12 w-full rounded-2xl border border-[#eadfc6] bg-[#FDFCF8] pl-11 text-base font-medium text-[#1f1737] outline-none transition-[border-color,box-shadow,background-color] placeholder:font-normal placeholder:text-[#b3a78c] hover:border-[#d9cba9] focus-visible:border-[#FF6B6B] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#FF6B6B]/15";
const fieldIconClassName =
  "pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#a8997a] transition-colors group-focus-within:text-[#FF5757]";
const fieldErrorClassName = "text-xs font-medium text-[#c53030]";
const fieldHintClassName = "text-xs font-medium text-[#8a7b5c]";
const emailStatusClassName = "flex items-start gap-1.5 text-xs font-medium";
const inlineLinkClassName = "font-bold underline underline-offset-2";

export interface WelcomeFormProps {
  defaultEmail: string;
  /** Where the flow leads afterwards (see the claim actions for the allowed values). */
  next?: string;
  flow?: SetupFlow;
  /** The email came with the link and cannot be typed: only the password is asked for. */
  lockedEmail?: boolean;
}

export function WelcomeForm({ defaultEmail, next = "", flow = "checkout", lockedEmail = false }: WelcomeFormProps) {
  const { check: checkEmail, claim, asksUsername, copy } = FLOWS[flow];

  const [state, setState] = useState<ClaimActionState>({ error: null });
  const [emailCheck, setEmailCheck] = useState<EmailCheck>(looksLikeEmail(defaultEmail) ? "checking" : "idle");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const emailInput = useRef<HTMLInputElement>(null);
  const openedAt = useRef(0);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Only the newest check may report: an answer for an email typed over since is dropped.
  const latestCheck = useRef(0);

  function cancelEmailCheck() {
    clearTimeout(checkTimer.current);
    latestCheck.current += 1;
  }

  function verifyEmail(value: string, delay: number) {
    cancelEmailCheck();
    const check = latestCheck.current;

    checkTimer.current = setTimeout(async () => {
      let status: Awaited<ReturnType<typeof checkEmail>>;
      try {
        status = await checkEmail(value);
      } catch {
        // Could not ask: say nothing here and let the submit give the answer.
        status = "invalid";
      }
      if (check !== latestCheck.current) return;

      if (status === "invalid") {
        setEmailCheck("idle");
        return;
      }
      if (status !== "not-on-record") {
        setEmailCheck(status);
        return;
      }

      const sinceOpened = Date.now() - openedAt.current;
      const inGracePeriod = sinceOpened < WEBHOOK_GRACE_MS;
      setEmailCheck(inGracePeriod ? "waiting" : "not-found");
      if (sinceOpened < STOP_RECHECKING_AFTER_MS) {
        verifyEmail(value, inGracePeriod ? RECHECK_INTERVAL_MS : LATE_RECHECK_INTERVAL_MS);
      }
    }, delay);
  }

  useEffect(() => {
    openedAt.current = Date.now();
    if (looksLikeEmail(defaultEmail)) verifyEmail(defaultEmail, 0);
    return cancelEmailCheck;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, for the email the redirect passed along
  }, []);

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    const { value } = event.target;
    if (looksLikeEmail(value)) {
      setEmailCheck("checking");
      verifyEmail(value, TYPING_PAUSE_MS);
    } else {
      cancelEmailCheck();
      setEmailCheck("idle");
    }
  }

  function checkEmailAgain() {
    const value = emailInput.current?.value ?? "";
    if (!looksLikeEmail(value)) return;
    setEmailCheck("checking");
    verifyEmail(value, 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        for (;;) {
          // On success the action signs the visitor in and redirects them on.
          const result = await claim(formData);
          if (!result.notOnRecord) {
            setState(result);
            return;
          }
          if (Date.now() - openedAt.current >= WEBHOOK_GRACE_MS) {
            // The email field carries the explanation.
            setState({ error: null });
            cancelEmailCheck();
            setEmailCheck("not-found");
            emailInput.current?.focus();
            return;
          }
          setConfirming(true);
          await new Promise((resolve) => setTimeout(resolve, RECHECK_INTERVAL_MS));
        }
      } finally {
        setConfirming(false);
      }
    });
  }

  // An email that cannot create a login is explained under its field; the button would only repeat it.
  const emailRefused = emailCheck === "not-found" || emailCheck === "already-set-up" || emailCheck === "expired";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
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
        {lockedEmail ? (
          // The email came with the link and is not typed here; only its verification shows.
          <input ref={emailInput} type="hidden" name="email" value={defaultEmail} />
        ) : (
          <>
            <label htmlFor="email" className={labelClassName}>
              {copy.emailLabel}
            </label>
            <div className="group relative">
              <Mail className={fieldIconClassName} />
              <input
                ref={emailInput}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
                defaultValue={defaultEmail}
                onChange={handleEmailChange}
                required
                aria-describedby="email-status"
                className={`${fieldClassName} pr-4`}
              />
            </div>
          </>
        )}
        <div id="email-status" aria-live="polite">
          {state.fieldErrors?.email ? (
            <p className={fieldErrorClassName}>{state.fieldErrors.email[0]}</p>
          ) : emailCheck === "checking" ? (
            <p className={`${emailStatusClassName} text-[#8a7b5c]`}>
              <LoaderCircle className="mt-px size-3.5 shrink-0 animate-spin" />
              {copy.checking}
            </p>
          ) : emailCheck === "waiting" ? (
            <p className={`${emailStatusClassName} text-[#8a7b5c]`}>
              <LoaderCircle className="mt-px size-3.5 shrink-0 animate-spin" />
              {copy.waiting}
            </p>
          ) : emailCheck === "ready" ? (
            <p className={`${emailStatusClassName} text-[#4a6b22]`}>
              <CircleCheck className="mt-px size-3.5 shrink-0" />
              {copy.ready}
            </p>
          ) : emailCheck === "not-found" ? (
            <p className={`${emailStatusClassName} text-[#c53030]`}>
              <CircleAlert className="mt-px size-3.5 shrink-0" />
              <span>
                {copy.notFound}{" "}
                <button type="button" onClick={checkEmailAgain} className={inlineLinkClassName}>
                  Check again
                </button>
              </span>
            </p>
          ) : emailCheck === "already-set-up" ? (
            <p className={`${emailStatusClassName} text-[#c53030]`}>
              <CircleAlert className="mt-px size-3.5 shrink-0" />
              <span>
                This email already has a login.{" "}
                <Link href="/login" className={inlineLinkClassName}>
                  Sign in instead
                </Link>
              </span>
            </p>
          ) : emailCheck === "expired" ? (
            <p className={`${emailStatusClassName} text-[#c53030]`}>
              <CircleAlert className="mt-px size-3.5 shrink-0" />
              <span>
                {copy.expired}{" "}
                <Link href="/forgot-password" className={inlineLinkClassName}>
                  Use &ldquo;Forgot password&rdquo;
                </Link>{" "}
                to finish setting up your account.
              </span>
            </p>
          ) : (
            <p className={fieldHintClassName}>{copy.emailHint}</p>
          )}
        </div>
      </div>

      {asksUsername && (
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
      )}

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
          <p className={fieldHintClassName}>
            At least 8 characters, with an uppercase letter, a lowercase letter and a number.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || emailRefused}
        className="group/submit mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF6B6B] text-base font-bold text-white shadow-[0_12px_24px_-12px_rgba(255,87,87,0.8)] transition-all outline-none hover:bg-[#ff5555] focus-visible:ring-4 focus-visible:ring-[#FF6B6B]/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            {confirming ? copy.confirming : copy.submitting}
          </>
        ) : (
          <>
            {copy.submit}
            <ArrowRight className="size-4 transition-transform group-hover/submit:translate-x-0.5" />
          </>
        )}
      </button>

      {confirming && (
        <p role="status" className="text-center text-sm font-medium text-[#6D5D3B]">
          {copy.confirmingNote}
        </p>
      )}
    </form>
  );
}
