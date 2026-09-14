import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { getProfile } from "@/features/users/services/user.service";
import { formatDate } from "@/lib/utils";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireCurrentUser();
  const profile = await getProfile(user);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage how you appear across Parrot LMS.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Email and role are managed by your administrator.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role</p>
            <Badge variant="outline">{profile.role}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Member since</p>
            <p className="font-medium">{formatDate(profile.createdAt)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>Update your display name, bio, and avatar.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm initialName={profile.name} initialBio={profile.bio ?? ""} initialImage={profile.image ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
