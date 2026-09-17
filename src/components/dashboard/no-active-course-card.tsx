import { BookOpen, PartyPopper } from "lucide-react";
import Link from "next/link";

interface NoActiveCourseCardProps {
  /** True when every enrolled course is already completed, rather than the student having none at all. */
  allCompleted?: boolean;
}

export function NoActiveCourseCard({ allCompleted = false }: NoActiveCourseCardProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl bg-[#FFD97D] p-8 text-center shadow-sm sm:p-10">
      <div className="flex size-14 items-center justify-center rounded-full bg-white/60">
        {allCompleted ? (
          <PartyPopper className="size-7 text-[#B07621]" />
        ) : (
          <BookOpen className="size-7 text-[#B07621]" />
        )}
      </div>
      <h3 className="font-heading text-xl font-bold text-[#3E341F] sm:text-2xl">
        {allCompleted ? "You've finished every course you're enrolled in!" : "No lesson in progress yet"}
      </h3>
      <p className="max-w-sm text-sm font-medium text-[#6D5D3B] sm:text-base">
        {allCompleted
          ? "Amazing work! Browse the library to start your next one."
          : "Pick a course from the library to start your first lesson together."}
      </p>
      <Link
        href="/courses"
        className="mt-2 flex items-center gap-2 rounded-full bg-[#FF6B6B] px-6 py-2.5 font-bold text-white transition-colors hover:bg-[#ff5555]"
      >
        Browse Lessons
      </Link>
    </div>
  );
}
