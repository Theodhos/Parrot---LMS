"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Root error boundary -- catches anything an app/ page or its server
 * components throw (a database outage, an unexpected exception, etc.)
 * instead of leaving the visitor on a blank page or a raw stack trace in
 * production. Next.js still shows its own dev overlay on top of this in
 * development, which is expected and useful for debugging.
 */
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="bg-destructive/10 text-destructive mb-2 flex size-10 items-center justify-center rounded-full">
            <AlertTriangle className="size-5" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We hit an unexpected error loading this page. This has been logged -- try again, or
            head back home.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={reset}>
            <RotateCw />
            Try again
          </Button>
          <Button variant="outline" render={<Link href="/">Go home</Link>} />
        </CardContent>
      </Card>
    </div>
  );
}
