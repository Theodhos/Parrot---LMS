"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { forgotPasswordAction, type ForgotPasswordActionState } from "@/features/auth/actions/password-reset.actions";

const initialState: ForgotPasswordActionState = { error: null, sent: false };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.sent) {
    return (
      <Alert>
        <AlertDescription>
          If an account matches, we&apos;ve emailed a link to choose a new password. It can take a few
          minutes to arrive -- check your spam folder too. The link works once and expires in 2 hours.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="identifier">Email or username</Label>
        <Input id="identifier" name="identifier" type="text" autoComplete="username" autoCapitalize="none" required />
      </div>
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Sending..." : "Email me a reset link"}
      </Button>
    </form>
  );
}
