import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import LogOnMount from "@/components/LogOnMount";
import InstructorShell from "@/components/instructor/InstructorShell";

export default async function InstructorDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  const [courseCount, quizCount, enrollmentCount, materialCount] =
    await Promise.all([
      prisma.course.count({
        where: {
          instructorId: session.userId,
        },
      }),
      prisma.quiz.count({
        where: {
          course: {
            instructorId: session.userId,
          },
        },
      }),
      prisma.enrollment.count({
        where: {
          course: {
            instructorId: session.userId,
          },
        },
      }),
      prisma.material.count({
        where: {
          course: {
            instructorId: session.userId,
          },
        },
      }),
    ]);

  return (
    <>
      <LogOnMount actionType="VIEW_DASHBOARD" />
      <InstructorShell
        title="Instructor Dashboard"
        description="Manage your courses, quizzes, materials, analytics, and student outputs from one focused workspace."
        sessionEmail={session.email}
        actions={[
          {
            label: "My Courses",
            href: "/instructor/courses",
            variant: "primary",
          },
          {
            label: "Create Course",
            href: "/instructor/courses/create",
            variant: "secondary",
          },
        ]}
      >
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Teaching Workspace
            </p>

            <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight">
              Build courses, generate questions, review submissions, and monitor
              learner progress
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600">
              FocusLMS gives you one instructor area for content delivery,
              adaptive assessments, essay review, and learning analytics.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Link
                href="/instructor/courses"
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:bg-white"
              >
                <p className="text-lg font-semibold">Manage Courses</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Open existing courses, materials, quizzes, and analytics.
                </p>
              </Link>

              <Link
                href="/instructor/courses/create"
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:bg-white"
              >
                <p className="text-lg font-semibold">Create New Course</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Start a new course space for learners and assessments.
                </p>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
              Quick Overview
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-300">Courses</p>
                <p className="mt-2 text-3xl font-bold">{courseCount}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-300">Quizzes</p>
                <p className="mt-2 text-3xl font-bold">{quizCount}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-300">Enrollments</p>
                <p className="mt-2 text-3xl font-bold">{enrollmentCount}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-300">Materials</p>
                <p className="mt-2 text-3xl font-bold">{materialCount}</p>
              </div>
            </div>
          </div>
        </div>
      </InstructorShell>
    </>
  );
}