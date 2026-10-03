import { BarChart3, BookOpen, GraduationCap, Percent, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/charts/stat-card";
import { SimpleAreaChart } from "@/components/charts/simple-area-chart";
import { SimpleBarChart } from "@/components/charts/simple-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { requireCurrentUser } from "@/lib/auth/session";
import { getAdminAnalytics } from "@/features/analytics/services/admin-analytics.service";
import { Role } from "@/generated/prisma";
import type { ChartConfig } from "@/components/ui/chart";

const popularConfig = {
  enrollmentCount: { label: "Enrollments", color: "var(--chart-1)" },
} satisfies ChartConfig;

const completionConfig = {
  completionRate: { label: "Completion %", color: "var(--chart-2)" },
} satisfies ChartConfig;

const enrollmentsConfig = {
  count: { label: "New enrollments", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default async function AdminAnalyticsPage() {
  const user = await requireCurrentUser();
  const isAdmin = user.role === Role.ADMIN;

  const analytics = await getAdminAnalytics(user);

  const popularData = analytics.mostPopularCourses.map((c) => ({
    title: c.title,
    enrollmentCount: c.enrollmentCount,
  }));
  const completionData = analytics.highestCompletionCourses.map((c) => ({
    title: c.title,
    completionRate: c.completionRate,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          {isAdmin ? "Platform-wide learning activity." : "Learning activity in the courses you teach."}
        </p>
      </div>

      <div className={isAdmin ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"}>
        <StatCard label="Students" value={analytics.totalStudents} icon={<Users className="size-4" />} />
        {isAdmin && (
          <StatCard label="Instructors" value={analytics.totalInstructors} icon={<GraduationCap className="size-4" />} />
        )}
        <StatCard
          label="Courses"
          value={analytics.totalCourses}
          icon={<BookOpen className="size-4" />}
          hint={`${analytics.publishedCourses} published · ${analytics.draftCourses} draft · ${analytics.archivedCourses} archived`}
        />
        <StatCard label="Enrollments" value={analytics.totalEnrollments} icon={<TrendingUp className="size-4" />} />
        <StatCard label="Completion rate" value={`${analytics.courseCompletionRate}%`} icon={<BarChart3 className="size-4" />} />
        <StatCard label="Avg. progress" value={`${analytics.averageCourseProgress}%`} icon={<Percent className="size-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New enrollments (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleAreaChart data={analytics.newEnrollmentsOverTime} config={enrollmentsConfig} xKey="date" series={["count"]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent student activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivityList items={analytics.recentStudentActivity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most popular courses</CardTitle>
          </CardHeader>
          <CardContent>
            {popularData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No enrollments yet.</p>
            ) : (
              <SimpleBarChart data={popularData} config={popularConfig} xKey="title" series={["enrollmentCount"]} layout="vertical" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Highest completion rate</CardTitle>
          </CardHeader>
          <CardContent>
            {completionData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No enrollments yet.</p>
            ) : (
              <SimpleBarChart data={completionData} config={completionConfig} xKey="title" series={["completionRate"]} layout="vertical" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Course performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrollments</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Avg. progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.coursePerformance.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell>{c.enrollmentCount}</TableCell>
                    <TableCell>{c.completedCount}</TableCell>
                    <TableCell>{c.averageProgress}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
