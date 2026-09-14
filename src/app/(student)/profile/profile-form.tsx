"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateProfileAction, type UpdateProfileActionState } from "@/features/users/actions/profile.actions";

const initialState: UpdateProfileActionState = { error: null, success: false };

export interface ProfileFormProps {
  initialName: string;
  initialBio: string;
  initialImage: string;
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function ProfileForm({ initialName, initialBio, initialImage }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const [imagePreview, setImagePreview] = useState(initialImage);

  useEffect(() => {
    if (state.success) {
      toast.success("Profile updated.");
    }
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <Avatar size="lg">
          {imagePreview && <AvatarImage src={imagePreview} alt={initialName} />}
          <AvatarFallback>{initials(initialName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="image">Avatar URL</Label>
          <Input
            id="image"
            name="image"
            defaultValue={initialImage}
            placeholder="https://..."
            onChange={(e) => setImagePreview(e.target.value)}
          />
          {state.fieldErrors?.image && <p className="text-xs text-destructive">{state.fieldErrors.image[0]}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={initialName} required minLength={2} maxLength={80} />
        {state.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={initialBio}
          rows={4}
          maxLength={1000}
          placeholder="Tell other learners a bit about yourself..."
        />
        {state.fieldErrors?.bio && <p className="text-xs text-destructive">{state.fieldErrors.bio[0]}</p>}
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
