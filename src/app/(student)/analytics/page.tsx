import { BarChart3, CheckCircle2, Clock, Flame, GraduationCap, Percent, PlayCircle, Trophy } from "lucide-react";
import { StatCard } from "@/components/charts/stat-card";
import { SimpleAreaChart } from "@/components/charts/simple-area-chart";
import { SimpleBarChart } from "@/components/charts/simple-bar-chart";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { SimplePieChart } from "@/components/charts/simple-pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatDuration } from "@/lib/utils";
import { getStudentAnalytics } from "@/features/analytics/services/student-analytics.service";
import type { ChartConfig } from "@/components/ui/chart";

const activityConfig = {
  minutes: { label: "Minutes learned", color: "var(--chart-1)" },
} satisfies ChartConfig;

const progressConfig = {
  progressPercent: { label: "Progress %", color: "var(--chart-1)" },
} satisfies ChartConfig;

const lessonsSplitConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  remaining: { label: "Remaining", color: "var(--chart-3)" },
} satisfies ChartConfig;

const quizConfig = {
  averageScore: { label: "Average score", color: "var(--chart-1)" },
  bestScore: { label: "Best score", color: "var(--chart-2)" },
} satisfies ChartConfig;

const weeklyConfig = {
  hours: { label: "Hours", color: "var(--chart-1)" },
} satisfies ChartConfig;

const monthlyConfig = {
  minutes: { label: "Minutes", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default async function AnalyticsPage() {
  const user = await requireCurrentUser();
  const analytics = await getStudentAnalytics(user);

  const lessonsSplit = [
    { status: "completed", count: analytics.totalLessonsCompleted },
    { status: "remaining", count: analytics.totalLessonsRemaining },
  ];

  const recentlyCompleted = analytics.recentActivity.filter((item) => item.type === "LESSON_COMPLETED");

  // Reshaped into plain object literals: the chart wrappers' generic constraint
  // needs an implicit index signature, which named DTO interfaces don't carry.
  const activityChartData = analytics.activityOverTime.map((p) => ({ date: p.date, minutes: p.minutes }));
  const progressChartData = analytics.progressPerCourse.map((p) => ({
    courseTitle: p.courseTitle,
    progressPercent: p.progressPercent,
  }));
  const quizChartData = analytics.quizPerformance.map((q) => ({
    quizTitle: q.quizTitle,
    averageScore: q.averageScore,
    bestScore: q.bestScore,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Your learning activity, all computed server-side.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total courses" value={analytics.totalCourses} icon={<GraduationCap className="size-4" />} />
        <StatCard label="Active courses" value={analytics.activeCourses} icon={<PlayCircle className="size-4" />} />
        <StatCard label="Completed courses" value={analytics.completedCourses} icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Completion rate" value={`${analytics.completionRate}%`} icon={<BarChart3 className="size-4" />} />
        <StatCard label="Avg. course progress" value={`${analytics.averageCourseProgress}%`} icon={<Percent className="size-4" />} />
        <StatCard label="Lessons completed" value={analytics.totalLessonsCompleted} icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Learning time" value={formatDuration(analytics.totalLearningMinutes * 60)} icon={<Clock className="size-4" />} />
        <StatCard label="Avg. quiz score" value={`${analytics.averageQuizScore}%`} icon={<Trophy className="size-4" />} />
        <StatCard label="Learning streak" value={`${analytics.learningStreakDays} days`} icon={<Flame className="size-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Learning activity (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart data={activityChartData} config={activityConfig} xKey="date" series={["minutes"]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed vs. remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart data={lessonsSplit} config={lessonsSplitConfig} dataKey="count" nameKey="status" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progress by course</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={progressChartData}
              config={progressConfig}
              xKey="courseTitle"
              series={["progressPercent"]}
              layout="vertical"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quiz performance</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.quizPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
            ) : (
              <SimpleBarChart data={quizChartData} config={quizConfig} xKey="quizTitle" series={["averageScore", "bestScore"]} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly learning hours</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={analytics.weeklyLearningHours} config={weeklyConfig} xKey="day" series={["hours"]} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly activity (last 12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={analytics.monthlyActivity} config={monthlyConfig} xKey="month" series={["minutes"]} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recently completed lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivityList items={recentlyCompleted} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
