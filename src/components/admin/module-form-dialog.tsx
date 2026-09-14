"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createModuleAction, updateModuleAction, type ModuleRecord } from "@/features/modules/actions/module.actions";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New module" : "Edit module"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-title">Title</Label>
            <Input
              id="module-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-description">Description</Label>
            <Textarea
              id="module-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
