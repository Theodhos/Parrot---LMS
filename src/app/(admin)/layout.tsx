import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();
  if (user.role !== Role.ADMIN && user.role !== Role.INSTRUCTOR) {
    redirect("/dashboard");
  }

  return (
    <DashboardShell variant="admin" user={user}>
      {children}
    </DashboardShell>
  );
}
