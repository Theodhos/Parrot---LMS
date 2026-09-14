import type { ReactNode } from "react";
import { requireCurrentUser } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();

  return (
    <DashboardShell variant="student" user={user}>
      {children}
    </DashboardShell>
  );
}
