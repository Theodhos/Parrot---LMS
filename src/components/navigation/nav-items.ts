import type { LucideIcon } from "lucide-react";
import { BarChart3, BookOpen, FolderCog, GraduationCap, LayoutDashboard, ImageIcon, User, Users } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Profile", href: "/profile", icon: User },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/admin/courses", icon: FolderCog },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
];

export const BRAND: NavItem = { label: "Parrot LMS", href: "/", icon: GraduationCap };
