"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface UserMenuProps {
  name: string;
  email: string;
  image?: string | null;
  role: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ name, email, image, role }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-8">
          {image && <AvatarImage src={image} alt={name} />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{email}</span>
          <span className="mt-1 w-fit rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {role.toLowerCase()}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <User />
          Profile
        </DropdownMenuItem>
        {(role === "ADMIN" || role === "INSTRUCTOR") && (
          <>
            <DropdownMenuItem render={<Link href="/admin/dashboard" />}>
              <LayoutDashboard />
              Admin panel
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard" />}>
              <User />
              Student view
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} variant="destructive">
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
