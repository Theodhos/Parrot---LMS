"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { UserMenu, type UserMenuProps } from "@/components/layout/user-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ADMIN_NAV_ITEMS, STUDENT_NAV_ITEMS } from "@/components/navigation/nav-items";
import { cn } from "@/lib/utils";

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
  const pathname = usePathname();
  const navItems = variant === "admin" ? ADMIN_NAV_ITEMS : STUDENT_NAV_ITEMS;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background px-4 md:px-8">
        <div className="mx-auto flex h-16 w-full max-w-7xl min-w-0 items-center gap-3 xl:gap-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            {/* The student menu sits in the header and only fits from lg up; below that
                it lives in this drawer. The admin menu is a sidebar that appears at md. */}
            <SheetTrigger
              aria-label="Open menu"
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted",
                variant === "student" ? "lg:hidden" : "md:hidden",
              )}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <Link href="/" className="mb-6 flex items-center pr-8">
                <Image src="/logo.png" alt="Parrot Kindergarten — Stop Guessing, Start Talking!" width={600} height={95} className="h-auto w-full" />
              </Link>
              <SidebarNav items={navItems} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/logo.png"
              alt="Parrot Kindergarten — Stop Guessing, Start Talking!"
              width={600}
              height={95}
              preload
              className="h-6 w-auto sm:h-7 md:h-9"
            />
          </Link>

          {variant === "student" && (
            <nav className="hidden items-center gap-1 lg:ml-2 lg:flex xl:ml-8 xl:gap-6">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-full",
                      active
                        ? "text-[#FF5757] border border-[#fcd5d5] bg-[#fff8f8]"
                        : "text-[#3E341F] hover:text-[#FF5757]",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            <NotificationsBell />
            <UserMenu {...user} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 bg-[#FDFCF8]">
        {variant === "admin" && (
          <aside className="hidden w-56 shrink-0 border-r p-3 md:block bg-background">
            <SidebarNav items={navItems} />
          </aside>
        )}
        {/* min-w-0: as a flex item, main would otherwise grow to fit its widest unbreakable
            child (a long title, a wide table) and make the whole page scroll sideways. */}
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
