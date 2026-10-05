import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Play, Users } from "lucide-react";

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/logo.png"
        alt="Parrot Kindergarten — Stop Guessing, Start Talking!"
        width={600}
        height={95}
        preload
        className={`h-auto max-w-full ${compact ? "w-64" : "w-80 xl:w-96"}`}
      />
    </Link>
  );
}

/**
 * Shared frame for every signed-out page: the brand panel (desktop only) next
 * to the form. Colours, radii and the bird photo are the student dashboard's,
 * so signing in feels like the first screen of the same product.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-[#FDFCF8] text-[#1f1737] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative m-4 mr-0 hidden flex-col justify-between overflow-hidden rounded-[2.5rem] border border-[#f3ecd7] bg-[#FCF6ED] p-10 lg:flex xl:p-14">
        {/* Soft colour fields behind everything */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 size-80 rounded-full bg-[#FFD97D]/45 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 size-96 rounded-full bg-[#B8D98C]/40 blur-3xl" />
          <div className="absolute top-1/2 right-0 size-64 rounded-full bg-[#FF6B6B]/10 blur-3xl" />
        </div>

        <div className="relative">
          <BrandLockup />
        </div>

        {/* Bird portrait with three floating previews of what is inside */}
        <div aria-hidden="true" className="relative mx-auto my-10 w-full max-w-md select-none">
          <div className="relative mx-auto aspect-square w-[68%]">
            <div className="absolute -top-3 -right-5 size-28 rounded-full bg-[#FFD97D]" />
            <div className="absolute -bottom-2 -left-6 size-20 rounded-full bg-[#B8D98C]" />
            <div className="absolute inset-0 rounded-full border-8 border-white bg-[url('https://images.unsplash.com/photo-1452570053594-1b985d6ea890?q=80&w=600&auto=format&fit=crop')] bg-cover bg-[center_35%] shadow-[0_24px_60px_-20px_rgba(62,52,31,0.35)]" />
          </div>

          <div className="absolute top-4 left-0 flex items-center gap-3 rounded-2xl border border-[#f3ecd7] bg-white px-4 py-3 shadow-[0_12px_30px_-12px_rgba(62,52,31,0.25)]">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#FF6B6B] text-white">
              <Play className="size-4 fill-current" />
            </span>
            <span className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-[#B07621] uppercase">Today&apos;s lesson</span>
              <span className="text-sm font-bold text-[#3E341F]">Pick up where you left off</span>
            </span>
          </div>

          <div className="absolute right-0 bottom-16 flex items-center gap-3 rounded-2xl border border-[#f3ecd7] bg-white px-4 py-3 shadow-[0_12px_30px_-12px_rgba(62,52,31,0.25)]">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#B8D98C] text-[#35501a]">
              <Users className="size-4" />
            </span>
            <span className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-[#5b7a34] uppercase">Community</span>
              <span className="text-sm font-bold text-[#3E341F]">Share wins, ask questions</span>
            </span>
          </div>

          <div className="absolute -bottom-3 left-8 flex items-center gap-2 rounded-full bg-[#FFD97D] px-4 py-2 text-sm font-bold text-[#3E341F] shadow-[0_12px_30px_-12px_rgba(62,52,31,0.3)]">
            <CalendarDays className="size-4" />
            Live sessions on the calendar
          </div>
        </div>

        <div className="relative max-w-lg">
          <h2 className="font-heading text-4xl leading-[1.05] font-bold text-[#1f1737] xl:text-5xl">
            Stop Guessing,
            <br />
            <span className="text-[#FF5757]">Start Talking!</span>
          </h2>
          <p className="mt-4 text-lg font-medium text-[#6D5D3B]">
            Step-by-step lessons, a friendly community and a shared calendar of live sessions &mdash; all in one
            place for you and your bird.
          </p>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        {/* The brand panel is hidden below lg, so a little of its warmth moves here */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute -top-24 -right-20 size-64 rounded-full bg-[#FFD97D]/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 size-72 rounded-full bg-[#B8D98C]/35 blur-3xl" />
        </div>

        <div className="relative mb-8 lg:hidden">
          <BrandLockup compact />
        </div>

        {/* Pages that still render a plain Card pick up the same soft shape as the sign-in panel */}
        <div className="relative w-full max-w-md [&_[data-slot=card]]:rounded-[2rem] [&_[data-slot=card]]:p-4 [&_[data-slot=card]]:shadow-[0_24px_60px_-28px_rgba(62,52,31,0.3)] [&_[data-slot=card]]:ring-[#f3ecd7] [&_[data-slot=card-title]]:text-2xl [&_[data-slot=card-title]]:font-bold [&_[data-slot=card-title]]:text-[#1f1737]">
          {children}
        </div>
      </main>
    </div>
  );
}
