import { requireCurrentUser } from "@/lib/auth/session";
import { listMyEnrollments } from "@/features/enrollments/services/enrollment.service";
import { getStudentAnalytics } from "@/features/analytics/services/student-analytics.service";
import { getLessonProgress } from "@/features/progress/services/progress.service";
import { EnrollmentStatus } from "@/generated/prisma";
import type { SessionUser } from "@/lib/permissions";
import { TodaysLessonCard } from "@/components/dashboard/todays-lesson-card";
import { KeepGoingCard } from "@/components/dashboard/keep-going-card";
import { NoActiveCourseCard } from "@/components/dashboard/no-active-course-card";
import { QuickLinksCard } from "@/components/dashboard/quick-links-card";
import { CommunityWinsCard } from "@/components/dashboard/community-wins-card";
import { BirdProfileCard } from "@/components/dashboard/bird-profile-card";
import { ThisWeekCard } from "@/components/dashboard/this-week-card";
import { ActionButtons } from "@/components/dashboard/action-buttons";

type MyEnrollment = Awaited<ReturnType<typeof listMyEnrollments>>[number];

interface ResumeLesson {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  progressPercent: number;
}

/** Resumes at the first not-yet-completed lesson (in course order), or the last lesson once everything is done. */
async function findResumeLesson(user: SessionUser, enrollment: MyEnrollment): Promise<ResumeLesson | null> {
  const lessons = enrollment.course.modules.flatMap((m) => m.lessons);
  if (lessons.length === 0) return null;

  const progressRows = await Promise.all(lessons.map((l) => getLessonProgress(user, l.id)));
  const firstIncompleteIndex = progressRows.findIndex((row) => !row?.completed);
  const resolvedIndex = firstIncompleteIndex === -1 ? lessons.length - 1 : firstIncompleteIndex;

  const lesson = lessons[resolvedIndex];
  if (!lesson) return null;
  const row = progressRows[resolvedIndex];

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    duration: lesson.duration,
    progressPercent: row?.completed ? 100 : Math.round(row?.progressPercent ?? 0),
  };
}

function toDurationMinutes(seconds: number | null, fallback: number): number {
  const minutes = Math.round((seconds ?? 0) / 60);
  return minutes > 0 ? minutes : fallback;
}

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const firstName = user.name.split(" ")[0];

  const [enrollments, analytics] = await Promise.all([listMyEnrollments(user), getStudentAnalytics(user)]);

  const activeEnrollments = enrollments.filter((e) => e.status === EnrollmentStatus.ACTIVE).slice(0, 2);
  const allCompleted = enrollments.length > 0 && enrollments.every((e) => e.status === EnrollmentStatus.COMPLETED);
  const [primaryEnrollment, secondaryEnrollment] = activeEnrollments;
  const [primaryLesson, secondaryLesson] = await Promise.all([
    primaryEnrollment ? findResumeLesson(user, primaryEnrollment) : Promise.resolve(null),
    secondaryEnrollment ? findResumeLesson(user, secondaryEnrollment) : Promise.resolve(null),
  ]);

  const hasSecondary = Boolean(secondaryEnrollment && secondaryLesson);

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-6 pb-10 mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-[#f3ecd7] bg-[#FCF6ED] p-8 shadow-sm md:p-12">
        <div className="relative z-10 max-w-xl">
          <h1 className="font-heading mb-2 text-4xl font-bold text-[#1f1737] md:text-5xl">
            Welcome back, {firstName}!
          </h1>
          <p className="text-lg font-medium text-[#6D5D3B]">
            Pick up where you and your bird left off today.
          </p>
        </div>

        {/* Decorative bird photo + bee, faded into the hero background */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] md:block" aria-hidden="true">
          <div
            className="absolute inset-y-0 right-0 w-full bg-[url('https://images.unsplash.com/photo-1452570053594-1b985d6ea890?q=80&w=500&auto=format&fit=crop')] bg-cover bg-[center_35%]"
            style={{
              maskImage: "linear-gradient(to right, transparent, black 30%)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 30%)",
            }}
          />
          <svg
            viewBox="0 0 90 50"
            className="absolute left-2 top-8 h-10 w-16 md:left-8 md:top-12"
            fill="none"
          >
            <path
              d="M2 40 C 20 44, 35 20, 52 18"
              stroke="#1f1737"
              strokeWidth="2"
              strokeDasharray="4 5"
              strokeLinecap="round"
              opacity="0.35"
            />
            <g transform="translate(52 6)">
              <ellipse cx="12" cy="12" rx="11" ry="9" fill="#FFD93D" stroke="#3E341F" strokeWidth="1.5" />
              <path d="M3 12h18M6 5.5h12M6 18.5h12" stroke="#3E341F" strokeWidth="1.5" />
              <ellipse cx="4" cy="4" rx="5" ry="3.5" fill="white" fillOpacity="0.85" transform="rotate(-20 4 4)" />
              <ellipse cx="6" cy="20" rx="5" ry="3.5" fill="white" fillOpacity="0.85" transform="rotate(20 6 20)" />
            </g>
          </svg>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Spans 8) */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Top Row: Today's Lesson + Keep Going */}
          <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-8">
            <div className={hasSecondary ? "h-full lg:col-span-5" : "h-full lg:col-span-8"}>
              {primaryEnrollment && primaryLesson ? (
                <TodaysLessonCard
                  title={primaryLesson.title}
                  description={primaryLesson.description ?? `Continue ${primaryEnrollment.course.title} where you left off.`}
                  progressPercent={primaryLesson.progressPercent}
                  durationMinutes={toDurationMinutes(primaryLesson.duration, 5)}
                  href={`/courses/${primaryEnrollment.course.slug}?lesson=${primaryLesson.id}`}
                />
              ) : (
                <NoActiveCourseCard allCompleted={allCompleted} />
              )}
            </div>
            {hasSecondary && secondaryEnrollment && secondaryLesson && (
              <div className="h-full lg:col-span-3">
                <KeepGoingCard
                  title={secondaryLesson.title}
                  description={
                    secondaryLesson.description ?? `Keep the momentum going in ${secondaryEnrollment.course.title}.`
                  }
                  durationMinutes={toDurationMinutes(secondaryLesson.duration, 3)}
                  href={`/courses/${secondaryEnrollment.course.slug}?lesson=${secondaryLesson.id}`}
                />
              </div>
            )}
          </div>

          {/* Bottom Row: Community Wins */}
          <div className="flex-1">
            <CommunityWinsCard />
          </div>
        </div>

        {/* Right Column (Spans 4) */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <QuickLinksCard />
          <BirdProfileCard
            name="Ellie"
            species="African Grey"
            streakDays={analytics.learningStreakDays}
            favoriteReward="Sunflower Seeds"
            nextGoal="Use 5 New Words"
            imageUrl="https://images.unsplash.com/photo-1452570053594-1b985d6ea890?q=80&w=150&auto=format&fit=crop"
          />
          <ThisWeekCard />
        </div>
      </div>

      {/* Action Buttons Section */}
      <ActionButtons />
    </div>
  );
}
