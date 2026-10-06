import type { Metadata } from "next";
import Image from "next/image";
import { Baloo_2, Nunito } from "next/font/google";
import { ArrowRight, Clock } from "lucide-react";
import { LessonVideoPlayer } from "@/components/lessons/lesson-video-player";
import { getFreeVideos } from "@/features/courses/services/free-videos.service";

// The typefaces of the standalone landing pages (/offer, /thank-you).
const baloo = Baloo_2({ subsets: ["latin"], weight: ["700", "800"] });
const nunito = Nunito({ subsets: ["latin"] });

/** Where the button at the end of the page leads: the main registration landing page. */
const REGISTRATION_URL = "https://registration.parrotkindergarten.com/main-landing-page-2";

export const metadata: Metadata = {
  title: "Free Lessons",
  description: "Watch free lessons from Parrot Kindergarten — no payment and no account needed.",
};

// The lessons come from the free courses in the database and change whenever an admin edits them.
export const dynamic = "force-dynamic";

function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/**
 * The public free-lessons page: up to three videos from the free courses and
 * one button on to the registration landing page. It sits outside every
 * route group on purpose -- no platform menu, no sign-in -- and anyone with
 * the link can watch (see free-videos.service for what counts as free).
 */
export default async function FreeCoursesPage() {
  const videos = await getFreeVideos();

  return (
    <div className={`${nunito.className} flex flex-1 flex-col bg-[#FCFCFC] text-[#1F142B]`}>
      <header className="px-6 pt-8">
        <Image
          src="/logo.png"
          alt="Parrot Kindergarten — Stop Guessing, Start Talking!"
          width={600}
          height={95}
          preload
          className="mx-auto h-auto w-64 max-w-full sm:w-80"
        />
      </header>

      <section className="px-6 pt-10 pb-12 text-center sm:pt-14">
        <span className="inline-flex items-center rounded-full border border-[#EB6B62]/30 bg-[#EB6B62]/10 px-4 py-2 text-xs font-bold tracking-[.09em] text-[#EB6B62] uppercase">
          Free lessons &middot; no payment needed
        </span>
        <h1
          className={`${baloo.className} mx-auto mt-6 max-w-3xl text-[clamp(30px,4.4vw,52px)] leading-[1.1] font-extrabold`}
        >
          {videos.length > 0 ? (
            <>
              Start With{" "}
              <span className="text-[#EB6B62]">
                {videos.length} Free {videos.length === 1 ? "Lesson" : "Lessons"}
              </span>
            </>
          ) : (
            <>
              Our <span className="text-[#EB6B62]">Free Lessons</span>
            </>
          )}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[17px] leading-[1.7] text-[#5E5E5F]">
          Watch them right here, as often as you like. No account, no card &mdash; just press play.
        </p>
      </section>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 sm:px-6">
        {videos.length > 0 ? (
          <ol className="flex flex-col gap-10">
            {videos.map((video, index) => (
              <li
                key={video.lessonId}
                className="overflow-hidden rounded-[28px] border-t-[5px] border-[#EB6B62] bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] sm:p-8"
              >
                <div className="mb-5 flex items-start gap-4">
                  <span
                    className={`${baloo.className} flex size-11 shrink-0 items-center justify-center rounded-full bg-[#EB6B62] text-xl font-extrabold text-white`}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h2 className={`${baloo.className} text-[22px] leading-tight font-bold break-words sm:text-[26px]`}>
                      {video.title}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-[#6A6354]">
                      <span className="break-words">{video.courseTitle}</span>
                      {video.durationSeconds > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {formatMinutes(video.durationSeconds)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <LessonVideoPlayer title={video.title} videoUrl={video.src} />

                {video.description && (
                  <p className="mt-5 text-[15px] leading-[1.7] break-words text-[#5E5E5F]">{video.description}</p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-[28px] border-t-[5px] border-[#EB6B62] bg-white px-6 py-14 text-center shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <h2 className={`${baloo.className} text-2xl font-bold`}>The free lessons are on their way</h2>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-[1.7] text-[#5E5E5F]">
              We&apos;re getting them ready. Check back soon &mdash; or take a look at the full program below.
            </p>
          </div>
        )}
      </main>

      <section className="bg-[#1F142B] px-6 py-16 text-center sm:py-20">
        <h2 className={`${baloo.className} mx-auto max-w-2xl text-[clamp(24px,3.2vw,38px)] leading-[1.2] font-extrabold text-[#FCFCFC]`}>
          Ready For <span className="text-[#FEDB7F]">The Full Program?</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-[1.7] text-white/80">
          These lessons are only the beginning. See everything that is waiting for you and your bird.
        </p>
        <a
          href={REGISTRATION_URL}
          className="mt-8 inline-flex items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(135deg,#EB6B62,#FEDB7F_55%,#FEDB7F)] px-9 py-4 text-base font-bold text-white shadow-[0_8px_32px_rgba(254,219,127,0.35)] transition-[transform,box-shadow] outline-none hover:-translate-y-0.5 hover:shadow-[0_12px_48px_rgba(254,219,127,0.55)] focus-visible:ring-4 focus-visible:ring-[#FEDB7F]/50"
        >
          See The Full Program
          <ArrowRight className="size-4" />
        </a>
      </section>

      <footer className="bg-[#1F142B] px-6 pb-8 text-center text-[12.5px] text-white/60">
        &copy; {new Date().getFullYear()} Parrot Kindergarten. All rights reserved.
      </footer>
    </div>
  );
}
