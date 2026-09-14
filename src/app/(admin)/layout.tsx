import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV_ITEMS } from "@/components/navigation/nav-items";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();
  if (user.role !== Role.ADMIN && user.role !== Role.INSTRUCTOR) {
    redirect("/dashboard");
  }

  return (
    <DashboardShell navItems={ADMIN_NAV_ITEMS} user={user}>
      {children}
    </DashboardShell>
  );
}
