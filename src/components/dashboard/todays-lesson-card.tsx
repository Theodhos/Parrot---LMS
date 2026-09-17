import { Play, Clock } from "lucide-react";
import Link from "next/link";

interface TodaysLessonCardProps {
  title: string;
  description: string;
  progressPercent: number;
  durationMinutes: number;
  href: string;
}

export function TodaysLessonCard({ title, description, progressPercent, durationMinutes, href }: TodaysLessonCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col md:flex-row gap-6 bg-[#FFD97D] rounded-3xl p-6 sm:p-8 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="shrink-0 flex items-center justify-center">
        <div className="relative size-32 md:size-40 rounded-full overflow-hidden border-4 border-white/60 bg-white/20">
          <img src="https://images.unsplash.com/photo-1452570053594-1b985d6ea890?q=80&w=250&auto=format&fit=crop" alt="Bird" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="flex flex-col justify-center flex-1">
        <span className="text-[11px] font-bold tracking-widest text-[#B07621] uppercase mb-1">
          Today&apos;s Lesson
        </span>
        <h3 className="font-heading text-2xl md:text-3xl font-bold text-[#3E341F] mb-2">{title}</h3>
        <p className="text-[#6D5D3B] text-sm md:text-base font-medium mb-4 max-w-md">
          {description}
        </p>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-3 flex-1 bg-white/50 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-[#3E341F] font-bold text-sm shrink-0">{progressPercent}%</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 bg-[#FF6B6B] group-hover:bg-[#ff5555] text-white px-6 py-2.5 rounded-full font-bold transition-colors">
            <Play className="size-4 fill-current" />
            Start Lesson
          </span>
          <div className="flex items-center gap-1.5 text-[#8c651e] font-bold text-sm bg-white/30 px-3 py-1.5 rounded-full">
            <Clock className="size-4" />
            {durationMinutes} min
          </div>
        </div>
      </div>
    </Link>
  );
}
