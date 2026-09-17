import { Users, BookOpen, TabletSmartphone, ChevronRight } from "lucide-react";
import Link from "next/link";

interface QuickLinkItem {
  icon: React.ElementType;
  iconBgClass: string;
  iconTextClass: string;
  title: string;
  subtitle: string;
  href: string;
}

const QUICK_LINKS: QuickLinkItem[] = [
  {
    icon: Users,
    iconBgClass: "bg-[#E6F3FB]",
    iconTextClass: "text-[#3B82F6]",
    title: "Weekly Office Hours",
    subtitle: "Join live or watch the replay",
    href: "/community#office-hours",
  },
  {
    icon: BookOpen,
    iconBgClass: "bg-[#FFF4E5]",
    iconTextClass: "text-[#F59E0B]",
    title: "Lesson Library",
    subtitle: "Browse all lessons",
    href: "/courses",
  },
  {
    icon: TabletSmartphone,
    iconBgClass: "bg-[#E8F5E9]",
    iconTextClass: "text-[#10B981]",
    title: "Tablet Setup Help",
    subtitle: "Guides & troubleshooting",
    href: "/support",
  },
];

export function QuickLinksCard() {
  return (
    <div className="flex flex-col bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
      <span className="text-[11px] font-bold tracking-widest text-[#FF5757] uppercase mb-4">
        Quick Links
      </span>
      <div className="flex flex-col gap-2">
        {QUICK_LINKS.map((link, i) => (
          <Link
            key={i}
            href={link.href}
            className="group flex items-center justify-between p-3 -mx-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`flex size-10 items-center justify-center rounded-full ${link.iconBgClass} ${link.iconTextClass}`}>
                <link.icon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-semibold text-[#1F2937] group-hover:text-[#FF5757] transition-colors">{link.title}</span>
                <span className="text-xs text-muted-foreground">{link.subtitle}</span>
              </div>
            </div>
            <ChevronRight className="size-4 text-gray-400 group-hover:text-[#FF5757] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
