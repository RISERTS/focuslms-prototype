import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import LogOnMount from "@/components/LogOnMount";
import StudentShell from "@/components/student/StudentShell";

export default async function StudentDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "STUDENT") {
    redirect("/login");
  }

  const [enrolledCount, availableCoursesCount, quizAttemptsCount] =
    await Promise.all([
      prisma.enrollment.count({
        where: {
          userId: session.userId,
        },
      }),
      prisma.course.count(),
      prisma.quizAttempt.count({
        where: {
          studentId: session.userId,
        },
      }),
    ]);

  return (
    <>
      <LogOnMount actionType="VIEW_DASHBOARD" />
      <StudentShell
        title="Student Dashboard"
        description="Open your enrolled courses, browse available classes, access learning materials, and continue your quizzes from one focused workspace."
        sessionEmail={session.email}
        actions={[
          {
            label: "My Enrolled Courses",
            href: "/student/enrolled",
            variant: "primary",
          },
          {
            label: "Browse Courses",
            href: "/student/courses",
            variant: "secondary",
          },
        ]}
      >
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Learning Space
            </p>

            <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight">
              Stay focused, continue your lessons, and complete your assessments
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600">
              Use your student workspace to access course materials, take quizzes,
              and view learning activities in a clean and distraction-minimized
              environment.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Link
                href="/student/enrolled"
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:bg-white"
              >
                <p className="text-lg font-semibold">Continue Learning</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Open the courses you already joined and continue your progress.
                </p>
              </Link>

              <Link
                href="/student/courses"
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:bg-white"
              >
                <p className="text-lg font-semibold">Find Courses</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Browse the full course list and join new classes.
                </p>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
              Quick Overview
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-300">Enrolled Courses</p>
                <p className="mt-2 text-3xl font-bold">{enrolledCount}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-300">Available Courses</p>
                <p className="mt-2 text-3xl font-bold">{availableCoursesCount}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-300">Quiz Attempts</p>
                <p className="mt-2 text-3xl font-bold">{quizAttemptsCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Link
            href="/student/enrolled"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-lg font-semibold">My Courses</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Open your enrolled classes and continue learning.
            </p>
          </Link>

          <Link
            href="/student/courses"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-lg font-semibold">Browse Courses</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Explore published subjects that are available for enrollment.
            </p>
          </Link>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold">Adaptive Learning</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Some quizzes may adapt their difficulty based on your performance
              and response time.
            </p>
          </div>
        </div>
      </StudentShell>
    </>
  );
}