"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createInstructorAction,
  type CreateInstructorResult,
} from "@/features/users/actions/admin-user.actions";

/** Admin-only: the one way an instructor account comes to exist. */
export function AddInstructorDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<CreateInstructorResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setEmail("");
      setPassword("");
      setResult(null);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const created = await createInstructorAction({ name, email, password });
      if (created.success) {
        toast.success("Instructor added.");
        handleOpenChange(false);
        router.refresh();
      } else {
        setResult(created);
      }
    });
  }

  const fieldErrors = result?.fieldErrors;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus />
        Add instructor
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add instructor</DialogTitle>
            <DialogDescription>
              Creates the account right away. Give the instructor this email and password to sign in with.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {result?.error && (
              <Alert variant="destructive">
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructor-name">Name</Label>
              <Input
                id="instructor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
                autoComplete="off"
                autoFocus
              />
              {fieldErrors?.name && <p className="text-destructive text-xs">{fieldErrors.name[0]}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructor-email">Email</Label>
              <Input
                id="instructor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
              {fieldErrors?.email && <p className="text-destructive text-xs">{fieldErrors.email[0]}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructor-password">Password</Label>
              <Input
                id="instructor-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
                autoComplete="off"
              />
              {fieldErrors?.password ? (
                <p className="text-destructive text-xs">{fieldErrors.password[0]}</p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  At least 8 characters, with an uppercase letter, a lowercase letter and a number.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Adding..." : "Add instructor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
