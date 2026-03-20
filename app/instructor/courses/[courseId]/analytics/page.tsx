import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { computeBEI } from "@/lib/bei";
import InstructorShell from "@/components/instructor/InstructorShell";

export default async function InstructorCourseAnalyticsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      enrollments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      quizzes: {
        select: {
          id: true,
          title: true,
        },
      },
      materials: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!course || course.instructorId !== session.userId) {
    redirect("/login");
  }

  const studentIds = course.enrollments.map((e) => e.user.id);

  const attempts =
    studentIds.length > 0
      ? await prisma.quizAttempt.findMany({
          where: {
            studentId: { in: studentIds },
            quiz: { courseId },
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            startedAt: "desc",
          },
        })
      : [];

  const logs =
    studentIds.length > 0
      ? await prisma.activityLog.findMany({
          where: {
            userId: { in: studentIds },
            courseId,
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : [];

  const totalQuizzes = course.quizzes.length;

  const baseRows = course.enrollments.map((enrollment) => {
    const student = enrollment.user;
    const studentAttempts = attempts.filter((a) => a.studentId === student.id);
    const studentLogs = logs.filter((l) => l.userId === student.id);

    const distinctCompletedQuizIds = new Set(
      studentAttempts.map((a) => a.quizId)
    );

    const completionRate =
      totalQuizzes > 0 ? distinctCompletedQuizIds.size / totalQuizzes : 0;

    const scoredAttempts = studentAttempts.filter(
      (a): a is typeof a & { score: number } => a.score !== null
    );

    const averageScore =
      scoredAttempts.length > 0
        ? scoredAttempts.reduce((sum, a) => sum + a.score, 0) /
          scoredAttempts.length
        : 0;

    const timeOnTaskSeconds = studentLogs.reduce(
      (sum, log) => sum + (log.durationSeconds ?? 0),
      0
    );

    const interactionCount = studentLogs.length;

    const materialsOpened = studentLogs.filter(
      (log) => log.actionType === "OPEN_MATERIAL"
    ).length;

    const quizzesSubmitted = studentLogs.filter(
      (log) => log.actionType === "SUBMIT_QUIZ"
    ).length;

    return {
      studentId: student.id,
      name: student.name,
      email: student.email,
      averageScore,
      completionRate,
      timeOnTaskSeconds,
      interactionCount,
      materialsOpened,
      quizzesSubmitted,
    };
  });

  const maxTimeOnTaskSeconds = Math.max(
    1,
    ...baseRows.map((row) => row.timeOnTaskSeconds)
  );
  const maxInteractionCount = Math.max(
    1,
    ...baseRows.map((row) => row.interactionCount)
  );

  const rows = baseRows.map((row) => {
    const { nt, ncr, nif, bei } = computeBEI({
      timeOnTaskSeconds: row.timeOnTaskSeconds,
      maxTimeOnTaskSeconds,
      completionRate: row.completionRate,
      interactionCount: row.interactionCount,
      maxInteractionCount,
    });

    return {
      ...row,
      nt,
      ncr,
      nif,
      bei,
    };
  });

  const overallAverageScore =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + row.averageScore, 0) / rows.length
      : 0;

  const overallCompletionRate =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + row.completionRate, 0) / rows.length
      : 0;

  const overallBEI =
    rows.length > 0 ? rows.reduce((sum, row) => sum + row.bei, 0) / rows.length : 0;

  return (
    <InstructorShell
      title={`${course.title} Analytics`}
      description="Monitor learner performance, engagement, completion, and Behavioral Engagement Index (BEI)."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${course.id}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Average Score
          </p>
          <p className="mt-3 text-3xl font-bold">
            {overallAverageScore.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Completion Rate
          </p>
          <p className="mt-3 text-3xl font-bold">
            {(overallCompletionRate * 100).toFixed(2)}%
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
            Average BEI
          </p>
          <p className="mt-3 text-3xl font-bold">{overallBEI.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Student Analytics</h2>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Avg Score</th>
                <th className="px-3 py-3">Completion</th>
                <th className="px-3 py-3">Time-on-Task</th>
                <th className="px-3 py-3">Interactions</th>
                <th className="px-3 py-3">Materials Opened</th>
                <th className="px-3 py-3">Quizzes Submitted</th>
                <th className="px-3 py-3">BEI</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-600">
                    No student analytics available yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.studentId} className="border-b border-gray-100">
                    <td className="px-3 py-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-gray-500">{row.email}</div>
                    </td>
                    <td className="px-3 py-4">{row.averageScore.toFixed(2)}%</td>
                    <td className="px-3 py-4">
                      {(row.completionRate * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-4">{row.timeOnTaskSeconds}s</td>
                    <td className="px-3 py-4">{row.interactionCount}</td>
                    <td className="px-3 py-4">{row.materialsOpened}</td>
                    <td className="px-3 py-4">{row.quizzesSubmitted}</td>
                    <td className="px-3 py-4 font-semibold">
                      {row.bei.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </InstructorShell>
  );
}