import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, GraduationCap, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { Role } from "@/generated/prisma";

export default async function HomePage() {
  const user = await getCurrentUser();
  const primaryHref = user ? (user.role === Role.STUDENT ? "/dashboard" : "/admin/dashboard") : "/register";

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <GraduationCap className="size-6" />
          Parrot LMS
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/courses">Browse courses</Link>} />
          {user ? (
            <Button render={<Link href={primaryHref}>Go to dashboard</Link>} />
          ) : (
            <>
              <Button variant="ghost" render={<Link href="/login">Sign in</Link>} />
              <Button render={<Link href="/register">Get started</Link>} />
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-16 px-6 py-24 text-center">
        <div className="flex max-w-2xl flex-col items-center gap-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Learn on your terms. Track progress that actually counts.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Structured courses, module-by-module lessons, and analytics that show exactly where you stand — every
            percentage is calculated server-side, never guessed on the frontend.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              render={
                <Link href={primaryHref}>
                  {user ? "Continue learning" : "Create a free account"}
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Button size="lg" variant="outline" render={<Link href="/courses">Browse courses</Link>} />
          </div>
        </div>

        <div className="grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<BookOpen className="size-5" />}
            title="Structured courses"
            description="Modules and lessons in the order instructors intended, with articles, video, documents and quizzes."
          />
          <FeatureCard
            icon={<LineChart className="size-5" />}
            title="Reliable progress"
            description="Course completion is always recalculated from your actual completed lessons on the server."
          />
          <FeatureCard
            icon={<BarChart3 className="size-5" />}
            title="Real analytics"
            description="Learning streaks, quiz performance and time invested — visualized, not just listed."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
