import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPasswordSetupContext } from "@/features/auth/services/activation.service";
import { ActivateForm } from "./activate-form";

interface ActivatePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const { token } = await searchParams;
  const context = token ? await getPasswordSetupContext(token) : null;

  if (!token || !context) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link expired or invalid</CardTitle>
          <CardDescription>
            This account-setup link is no longer valid. It may have already been used, or it
            expired 48 hours after it was requested.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Already set your password before?{" "}
              <Link href="/login" className="font-medium underline underline-offset-4">
                Sign in instead
              </Link>
              .
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>You&apos;re in! Create your login</CardTitle>
        <CardDescription>
          Your purchase is confirmed for <strong>{context.email}</strong>. Choose a username and
          password to access your course on Parrot LMS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActivateForm token={token} />
      </CardContent>
    </Card>
  );
}
