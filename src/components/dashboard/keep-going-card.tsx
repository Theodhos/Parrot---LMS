import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

interface KeepGoingCardProps {
  title: string;
  description: string;
  durationMinutes: number;
  href: string;
}

export function KeepGoingCard({ title, description, durationMinutes, href }: KeepGoingCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-6 bg-[#CDE0A9] rounded-3xl p-6 sm:p-8 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold tracking-widest text-[#5F7A2A] uppercase mb-1">
            Keep Going
          </span>
          <h3 className="font-heading text-xl md:text-2xl font-bold text-[#344018] mb-1">
            {title}
          </h3>
          <p className="text-[#4E6221] text-sm font-medium mb-4">
            {description}
          </p>
        </div>
        <div className="shrink-0 relative size-24 rounded-full overflow-hidden border-4 border-white/60 bg-white/20">
          <img src="https://images.unsplash.com/photo-1555169062-013468b47731?q=80&w=250&auto=format&fit=crop" alt="Bird" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-4">
        <span className="flex-1 flex items-center justify-center gap-2 bg-white group-hover:bg-white/90 text-[#344018] px-4 py-2.5 rounded-full font-bold transition-colors">
          Continue Practice
          <ArrowRight className="size-4" />
        </span>
        <div className="flex items-center gap-1.5 text-[#5F7A2A] font-bold text-sm">
          <Clock className="size-4" />
          {durationMinutes} min
        </div>
      </div>
    </Link>
  );
}
