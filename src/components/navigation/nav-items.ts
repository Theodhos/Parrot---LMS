import type { LucideIcon } from "lucide-react";
import { BarChart3, BookOpen, FolderCog, GraduationCap, LayoutDashboard, Users, Home, Calendar, Bird, Gift } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Lessons", href: "/courses", icon: BookOpen },
  { label: "Free Courses", href: "/free-courses", icon: Gift },
  { label: "Community", href: "/community", icon: Users },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "My Bird", href: "/profile", icon: Bird },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/admin/courses", icon: FolderCog },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Calendar", href: "/admin/calendar", icon: Calendar },
];

export const BRAND: NavItem = { label: "Parrot LMS", href: "/", icon: GraduationCap };
