"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { activateAccountAction, type ActivateActionState } from "@/features/auth/actions/activate.actions";

const initialState: ActivateActionState = { error: null };

export function ActivateForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(activateAccountAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          required
          minLength={3}
          maxLength={30}
        />
        {state.fieldErrors?.username && (
          <p className="text-destructive text-xs">{state.fieldErrors.username[0]}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        {state.fieldErrors?.password && (
          <p className="text-destructive text-xs">{state.fieldErrors.password[0]}</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Setting up your account..." : "Create account & start learning"}
      </Button>
    </form>
  );
}
