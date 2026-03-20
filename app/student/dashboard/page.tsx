import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import LogOnMount from "@/components/LogOnMount";
import ConfirmLogoutButton from "@/components/ConfirmLogoutButton";

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
    <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 text-gray-900">
      <LogOnMount actionType="VIEW_DASHBOARD" />

      <section className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
              FocusLMS
            </p>
            <h1 className="mt-2 text-2xl font-bold">Student Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, {session.email}
            </p>
          </div>

          <ConfirmLogoutButton />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Learning Space
            </p>

            <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight">
              Stay focused, access your courses, and continue your assessments
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600">
              Use your dashboard to open enrolled courses, browse available
              subjects, access materials, and take quizzes in a clean and
              distraction-minimized interface.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/student/enrolled"
                className="rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                My Enrolled Courses
              </Link>

              <Link
                href="/student/courses"
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Browse Courses
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
            <p className="text-lg font-semibold">Enrolled Courses</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Open the courses you already joined and continue your lessons.
            </p>
          </Link>

          <Link
            href="/student/courses"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-lg font-semibold">Available Courses</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Explore the list of published courses and enroll in new subjects.
            </p>
          </Link>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold">Adaptive Learning</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Some quizzes may use rule-based adaptive assessment to adjust
              question difficulty based on your performance and response time.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}