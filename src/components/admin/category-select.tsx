"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
} from "@/features/courses/actions/category.actions";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const toolClassName =
  "text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium";

export interface CategorySelectProps {
  categories: { id: string; name: string }[];
  defaultValue?: string;
  /** Only admins add, rename and delete categories; the server enforces it regardless of this flag. */
  canManage?: boolean;
}

/**
 * The course form's category field. For an admin it also manages the list on
 * the spot: add a category (it gets selected), or rename or delete the
 * selected one. It sits inside the course <form>, so these are plain buttons
 * rather than a nested form.
 */
export function CategorySelect({ categories, defaultValue = "", canManage = false }: CategorySelectProps) {
  const [items, setItems] = useState(categories);
  const [value, setValue] = useState(defaultValue);
  const [editing, setEditing] = useState<"add" | "rename" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected = items.find((item) => item.id === value);

  function closeEditor() {
    setEditing(null);
    setName("");
    setError(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result =
        editing === "rename" && selected
          ? await renameCategoryAction(selected.id, name)
          : await createCategoryAction(name);
      if (result.success && result.category) {
        const saved = result.category;
        setItems((prev) =>
          [...prev.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setValue(saved.id);
        toast.success(editing === "rename" ? "Category renamed." : "Category added.");
        closeEditor();
      } else {
        setError(result.error ?? "Failed to save category.");
      }
    });
  }

  function handleDelete() {
    if (!selected) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(selected.id);
      if (result.success) {
        setItems((prev) => prev.filter((item) => item.id !== selected.id));
        setValue("");
        toast.success(`"${selected.name}" deleted.`);
        setConfirmingDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete category.");
      }
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // Enter must not submit the surrounding course form.
      e.preventDefault();
      if (name.trim() && !pending) handleSave();
    } else if (e.key === "Escape") {
      closeEditor();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Label htmlFor="categoryId">Category</Label>
        {canManage && !editing && (
          <div className="flex items-center gap-3">
            {selected && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setName(selected.name);
                    setEditing("rename");
                  }}
                  className={toolClassName}
                >
                  <Pencil className="size-3" />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className={`${toolClassName} hover:text-destructive`}
                >
                  <Trash2 className="size-3" />
                  Delete
                </button>
              </>
            )}
            <button type="button" onClick={() => setEditing("add")} className={toolClassName}>
              <Plus className="size-3" />
              Add category
            </button>
          </div>
        )}
      </div>
      <select
        id="categoryId"
        name="categoryId"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={editing === "rename"}
        className={selectClassName}
      >
        <option value="">No category</option>
        {items.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {/* A disabled select is left out of the form data, so keep the value while renaming. */}
      {editing === "rename" && <input type="hidden" name="categoryId" value={value} />}

      {editing && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Input
              aria-label={editing === "rename" ? "Category name" : "New category name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={editing === "rename" ? "Category name" : "New category name"}
              maxLength={60}
              autoFocus
            />
            <Button type="button" size="sm" onClick={handleSave} disabled={pending || !name.trim()}>
              {pending ? "Saving..." : editing === "rename" ? "Save" : "Add"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={closeEditor} disabled={pending}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
      )}

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{selected?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              The category is removed everywhere. Courses in it are kept and become uncategorized. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={handleDelete}>
              {pending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
