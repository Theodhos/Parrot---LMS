"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Layers } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createModuleAction, updateModuleAction, type ModuleRecord } from "@/features/modules/actions/module.actions";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

export interface ModuleFormDialogProps {
  courseId: string;
  mode: "create" | "edit";
  initialModule?: ModuleRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (module: ModuleRecord) => void;
}

export function ModuleFormDialog({
  courseId,
  mode,
  initialModule,
  open,
  onOpenChange,
  onSaved,
}: ModuleFormDialogProps) {
  const [title, setTitle] = useState(initialModule?.title ?? "");
  const [description, setDescription] = useState(initialModule?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createModuleAction(courseId, { title, description: description || undefined })
          : await updateModuleAction(courseId, initialModule!.id, { title, description: description || undefined });
      if (result.success && result.module) {
        toast.success(mode === "create" ? "Module added." : "Module updated.");
        onSaved(result.module);
        onOpenChange(false);
      } else {
        setError(result.error ?? "Failed to save module.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-2xl p-6 sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-3 pr-8">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Layers className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="text-lg font-semibold">
              {mode === "create" ? "New module" : "Edit module"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "A module groups related lessons. You add the lessons after saving."
                : "Change how this module is named and described."}
            </DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="module-title">Title</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <Input
              id="module-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Getting started"
              className="h-10"
              required
              minLength={2}
              maxLength={TITLE_MAX}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="module-description">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            {/* Grows downward with the text up to a limit, then scrolls; it never widens the dialog. */}
            <Textarea
              id="module-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students cover in this module?"
              className="max-h-56 min-h-28 resize-none overflow-y-auto leading-relaxed"
              maxLength={DESCRIPTION_MAX}
            />
          </div>
          <DialogFooter className="-mx-6 -mb-6 rounded-b-2xl px-6">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="px-4" disabled={pending || title.trim().length < 2}>
              {pending ? "Saving..." : mode === "create" ? "Add module" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
