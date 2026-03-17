import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { computeBEI } from "@/lib/bei";

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
    rows.length > 0
      ? rows.reduce((sum, row) => sum + row.bei, 0) / rows.length
      : 0;

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">{course.title} - Analytics</h1>
      <p className="mt-2 text-gray-600">
        {course.enrollments.length} student(s) enrolled
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="mt-2 text-2xl font-semibold">
            {overallAverageScore.toFixed(2)}%
          </p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Average Completion Rate</p>
          <p className="mt-2 text-2xl font-semibold">
            {(overallCompletionRate * 100).toFixed(2)}%
          </p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Average BEI</p>
          <p className="mt-2 text-2xl font-semibold">
            {overallBEI.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Total Quizzes</p>
          <p className="mt-2 text-2xl font-semibold">{course.quizzes.length}</p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Total Materials</p>
          <p className="mt-2 text-2xl font-semibold">
            {course.materials.length}
          </p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="mt-2 text-2xl font-semibold">
            {course.enrollments.length}
          </p>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 text-left">Student</th>
              <th className="p-3 text-left">Avg Score</th>
              <th className="p-3 text-left">Completion</th>
              <th className="p-3 text-left">Time-on-Task</th>
              <th className="p-3 text-left">Interactions</th>
              <th className="p-3 text-left">Materials Opened</th>
              <th className="p-3 text-left">Quizzes Submitted</th>
              <th className="p-3 text-left">NT</th>
              <th className="p-3 text-left">NCR</th>
              <th className="p-3 text-left">NIF</th>
              <th className="p-3 text-left">BEI</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-4 text-center">
                  No student analytics available yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.studentId} className="border-b">
                  <td className="p-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-gray-500">{row.email}</div>
                  </td>
                  <td className="p-3">{row.averageScore.toFixed(2)}%</td>
                  <td className="p-3">
                    {(row.completionRate * 100).toFixed(2)}%
                  </td>
                  <td className="p-3">{row.timeOnTaskSeconds}s</td>
                  <td className="p-3">{row.interactionCount}</td>
                  <td className="p-3">{row.materialsOpened}</td>
                  <td className="p-3">{row.quizzesSubmitted}</td>
                  <td className="p-3">{row.nt.toFixed(2)}</td>
                  <td className="p-3">{row.ncr.toFixed(2)}</td>
                  <td className="p-3">{row.nif.toFixed(2)}</td>
                  <td className="p-3 font-semibold">{row.bei.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}