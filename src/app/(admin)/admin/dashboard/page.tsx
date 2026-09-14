import Link from "next/link";
import { BarChart3, BookOpen, GraduationCap, Percent, Plus, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/charts/stat-card";
import { SimpleBarChart } from "@/components/charts/simple-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseLevelBadge } from "@/components/courses/course-level-badge";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { requireCurrentUser } from "@/lib/auth/session";
import { listCourses } from "@/features/courses/services/course.service";
import { getAdminAnalytics } from "@/features/analytics/services/admin-analytics.service";
import { CourseStatus, Role } from "@/generated/prisma";
import type { ChartConfig } from "@/components/ui/chart";

const popularConfig = {
  enrollmentCount: { label: "Enrollments", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default async function AdminDashboardPage() {
  const user = await requireCurrentUser();

  if (user.role === Role.ADMIN) {
    const analytics = await getAdminAnalytics(user);
    const popularData = analytics.mostPopularCourses.map((c) => ({
      title: c.title,
      enrollmentCount: c.enrollmentCount,
    }));

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Platform overview.</p>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/admin/analytics">View full analytics</Link>} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Students" value={analytics.totalStudents} icon={<Users className="size-4" />} />
          <StatCard label="Instructors" value={analytics.totalInstructors} icon={<GraduationCap className="size-4" />} />
          <StatCard
            label="Courses"
            value={analytics.totalCourses}
            icon={<BookOpen className="size-4" />}
            hint={`${analytics.publishedCourses} published · ${analytics.draftCourses} draft`}
          />
          <StatCard label="Enrollments" value={analytics.totalEnrollments} icon={<TrendingUp className="size-4" />} />
          <StatCard label="Completion rate" value={`${analytics.courseCompletionRate}%`} icon={<BarChart3 className="size-4" />} />
          <StatCard label="Avg. progress" value={`${analytics.averageCourseProgress}%`} icon={<Percent className="size-4" />} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
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
              <CardTitle>Recent student activity</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivityList items={analytics.recentStudentActivity} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Instructor: a simpler "your courses" summary -- there's no instructor-scoped analytics service.
  const { items, total } = await listCourses({ instructorId: user.id, page: 1, pageSize: 50 });
  const published = items.filter((c) => c.status === CourseStatus.PUBLISHED).length;
  const totalEnrollments = items.reduce((sum, c) => sum + c.enrollmentCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">An overview of the courses you teach.</p>
        </div>
        <Button render={<Link href="/admin/courses/new" />}>
          <Plus />
          New course
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Your courses" value={total} icon={<BookOpen className="size-4" />} />
        <StatCard label="Published" value={published} icon={<GraduationCap className="size-4" />} />
        <StatCard label="Total enrollments" value={totalEnrollments} icon={<Users className="size-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your courses</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You don&apos;t have any courses yet.{" "}
              <Link href="/admin/courses/new" className="text-primary underline underline-offset-4">
                Create your first course
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((course) => (
                <Link
                  key={course.id}
                  href={`/admin/courses/${course.id}`}
                  className="hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{course.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {course.moduleCount} module{course.moduleCount === 1 ? "" : "s"} ·{" "}
                      {course.enrollmentCount} enrolled
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CourseLevelBadge level={course.level} />
                    <Badge variant="outline">{course.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
