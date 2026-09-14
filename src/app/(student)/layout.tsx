import type { ReactNode } from "react";
import { requireCurrentUser } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { STUDENT_NAV_ITEMS } from "@/components/navigation/nav-items";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();

  return (
    <DashboardShell navItems={STUDENT_NAV_ITEMS} user={user}>
      {children}
    </DashboardShell>
  );
}
