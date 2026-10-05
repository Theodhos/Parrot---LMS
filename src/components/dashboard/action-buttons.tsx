import { Camera, MessageCircleQuestion, Trophy } from "lucide-react";
import Link from "next/link";

export function ActionButtons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link href="/community?compose=question" className="group relative overflow-hidden bg-[#FF6B6B] rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:bg-[#ff5555] transition-colors">
        <div className="flex size-10 sm:size-12 items-center justify-center rounded-full bg-white text-[#FF6B6B] shrink-0 z-10">
          <MessageCircleQuestion className="size-5 sm:size-6" />
        </div>
        <div className="flex flex-col z-10">
          <span className="font-heading font-bold text-white text-lg leading-tight">Ask a Question</span>
          <span className="text-white/80 text-sm">Get help from our community</span>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-hover:translate-x-2 transition-transform">
          <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 20H90" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M80 10L95 20L80 30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>

      <Link href="/community?compose=win" className="group relative overflow-hidden bg-[#4CA6F8] rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:bg-[#3b9af2] transition-colors">
        <div className="flex size-10 sm:size-12 items-center justify-center rounded-full bg-white text-[#4CA6F8] shrink-0 z-10">
          <Trophy className="size-5 sm:size-6" />
        </div>
        <div className="flex flex-col z-10">
          <span className="font-heading font-bold text-white text-lg leading-tight">Share a Win</span>
          <span className="text-white/80 text-sm">Celebrate a milestone</span>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-hover:translate-x-2 transition-transform">
          <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 20H90" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M80 10L95 20L80 30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>

      <Link href="/community?compose=video" className="group relative overflow-hidden bg-[#88C654] rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:bg-[#7bc046] transition-colors">
        <div className="flex size-10 sm:size-12 items-center justify-center rounded-full bg-white text-[#88C654] shrink-0 z-10">
          <Camera className="size-5 sm:size-6" />
        </div>
        <div className="flex flex-col z-10">
          <span className="font-heading font-bold text-white text-lg leading-tight">Photo or Video</span>
          <span className="text-white/80 text-sm">Get feedback & support</span>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-hover:translate-x-2 transition-transform">
          <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 20H90" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M80 10L95 20L80 30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>
    </div>
  );
}
