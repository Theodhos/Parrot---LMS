"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { GraduationCap, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { UserMenu, type UserMenuProps } from "@/components/layout/user-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ADMIN_NAV_ITEMS, STUDENT_NAV_ITEMS } from "@/components/navigation/nav-items";

export interface DashboardShellProps {
  /**
   * Which nav item set to render. Deliberately a plain string rather than
   * NavItem[] passed down from the server layout -- NavItem.icon holds a
   * Lucide component reference, and passing component/function values as
   * props from a Server Component into a Client Component is not allowed
   * (React can't serialize them across that boundary).
   */
  variant: "student" | "admin";
  user: UserMenuProps;
  children: ReactNode;
}

export function DashboardShell({ variant, user, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = variant === "admin" ? ADMIN_NAV_ITEMS : STUDENT_NAV_ITEMS;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden">
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <Link href="/" className="mb-6 flex items-center gap-2 text-base font-semibold">
              <GraduationCap className="size-5" />
              Parrot LMS
            </Link>
            <SidebarNav items={navItems} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <Link href="/" className="hidden items-center gap-2 text-base font-semibold md:flex">
          <GraduationCap className="size-5" />
          Parrot LMS
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <NotificationsBell />
          <UserMenu {...user} />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r p-3 md:block">
          <SidebarNav items={navItems} />
        </aside>
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
