import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";
import AnalyticsBarChart from "@/components/analytics/AnalyticsBarChart";

function termLabel(term: string) {
  if (term === "PRELIMS") return "Prelims";
  if (term === "MIDTERMS") return "Midterms";
  return "Finals";
}

export default async function StudentDashboardPage() {
  const session = await getSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const now = new Date();

  const [approvedEnrollments, pendingCount, recentAttempts] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        userId: session.userId,
        status: "APPROVED",
      },
      select: {
        course: {
          select: {
            id: true,
            title: true,
            quizzes: {
              where: {
                closesAt: {
                  gte: now,
                },
              },
              orderBy: {
                closesAt: "asc",
              },
              select: {
                id: true,
                title: true,
                term: true,
                closesAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.enrollment.count({
      where: {
        userId: session.userId,
        status: "PENDING",
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId: session.userId,
        finishedAt: {
          not: null,
        },
      },
      orderBy: {
        finishedAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        score: true,
        finishedAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            term: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const deadlines = approvedEnrollments
    .flatMap((enrollment) =>
      enrollment.course.quizzes
        .filter((quiz) => quiz.closesAt)
        .map((quiz) => ({
          quizId: quiz.id,
          quizTitle: quiz.title,
          courseId: enrollment.course.id,
          courseTitle: enrollment.course.title,
          term: quiz.term,
          closesAt: quiz.closesAt as Date,
        }))
    )
    .sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime())
    .slice(0, 8);

  const recentScoreChartData = recentAttempts
    .slice()
    .reverse()
    .map((attempt) => ({
      label: attempt.quiz.title,
      value: attempt.score ?? 0,
      helper: `${attempt.quiz.course.title} • ${termLabel(attempt.quiz.term)}`,
    }));

  const recentAverage =
    recentAttempts.length > 0
      ? recentAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
        recentAttempts.length
      : 0;

  return (
    <StudentShell
      title="Student Dashboard"
      description="View your active courses, upcoming deadlines, and your latest quiz results."
      sessionEmail={session.email}
      actions={[
        {
          label: "My Courses",
          href: "/student/enrolled",
          variant: "secondary",
        },
        {
          label: "Browse Courses",
          href: "/student/courses",
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Approved Courses
          </p>
          <p className="mt-3 text-3xl font-bold">{approvedEnrollments.length}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Pending Requests
          </p>
          <p className="mt-3 text-3xl font-bold">{pendingCount}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Upcoming Deadlines
          </p>
          <p className="mt-3 text-3xl font-bold">{deadlines.length}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
            Recent Average
          </p>
          <p className="mt-3 text-3xl font-bold">{recentAverage.toFixed(2)}%</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Upcoming Deadlines</h2>
            <Link
              href="/student/enrolled"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Open My Courses
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {deadlines.length === 0 ? (
              <p className="text-sm text-gray-600">
                No upcoming quiz deadlines right now.
              </p>
            ) : (
              deadlines.map((deadline) => (
                <Link
                  key={deadline.quizId}
                  href={`/student/courses/${deadline.courseId}/quizzes/${deadline.quizId}`}
                  className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{deadline.quizTitle}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {deadline.courseTitle} • {termLabel(deadline.term)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                        Closes
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {deadline.closesAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <AnalyticsBarChart
          title="Recent Quiz Scores"
          data={recentScoreChartData}
          suffix="%"
          emptyMessage="No finished quiz attempts yet."
        />
      </div>

      <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">Latest Results</h2>

        <div className="mt-6 space-y-4">
          {recentAttempts.length === 0 ? (
            <p className="text-sm text-gray-600">No finished quiz attempts yet.</p>
          ) : (
            recentAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{attempt.quiz.title}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {attempt.quiz.course.title} • {termLabel(attempt.quiz.term)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Finished:{" "}
                      {attempt.finishedAt
                        ? attempt.finishedAt.toLocaleString()
                        : "Not finished"}
                    </p>
                  </div>

                  <div className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
                    {(attempt.score ?? 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StudentShell>
  );
}