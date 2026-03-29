import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { computeBei } from "@/lib/bei";
import InstructorShell from "@/components/instructor/InstructorShell";

function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{value.toFixed(2)}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

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
    select: {
      id: true,
      title: true,
      courseCode: true,
      instructorId: true,
      materials: {
        select: {
          id: true,
        },
      },
      quizzes: {
        select: {
          id: true,
        },
      },
      enrollments: {
        where: {
          status: "APPROVED",
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!course || course.instructorId !== session.userId) {
    redirect("/login");
  }

  const studentIds = course.enrollments.map((enrollment) => enrollment.user.id);
  const materialIds = course.materials.map((material) => material.id);
  const quizIds = course.quizzes.map((quiz) => quiz.id);

  const activityLogs =
    studentIds.length > 0
      ? await prisma.activityLog.findMany({
          where: {
            courseId,
            userId: {
              in: studentIds,
            },
          },
          select: {
            userId: true,
            actionType: true,
            targetId: true,
            durationSeconds: true,
          },
        })
      : [];

  const quizAttempts =
    studentIds.length > 0 && quizIds.length > 0
      ? await prisma.quizAttempt.findMany({
          where: {
            studentId: {
              in: studentIds,
            },
            quizId: {
              in: quizIds,
            },
            finishedAt: {
              not: null,
            },
          },
          select: {
            studentId: true,
            quizId: true,
          },
        })
      : [];

  const materialIdSet = new Set(materialIds);

  const baseRows = course.enrollments.map((enrollment) => ({
    studentId: enrollment.user.id,
    studentName: enrollment.user.name,
    studentEmail: enrollment.user.email,
    timeOnTaskSeconds: 0,
    interactionCount: 0,
    openedMaterials: new Set<string>(),
    completedQuizzes: new Set<string>(),
  }));

  const rowMap = new Map(baseRows.map((row) => [row.studentId, row]));

  for (const log of activityLogs) {
    const row = rowMap.get(log.userId);
    if (!row) continue;

    row.interactionCount += 1;
    row.timeOnTaskSeconds += log.durationSeconds ?? 0;

    if (
      log.actionType === "OPEN_MATERIAL" &&
      log.targetId &&
      materialIdSet.has(log.targetId)
    ) {
      row.openedMaterials.add(log.targetId);
    }
  }

  for (const attempt of quizAttempts) {
    const row = rowMap.get(attempt.studentId);
    if (!row) continue;
    row.completedQuizzes.add(attempt.quizId);
  }

  const totalTrackables = course.materials.length + course.quizzes.length;

  const rawRows = baseRows.map((row) => {
    const completionRate =
      totalTrackables > 0
        ? (row.openedMaterials.size + row.completedQuizzes.size) / totalTrackables
        : 0;

    return {
      studentId: row.studentId,
      studentName: row.studentName,
      studentEmail: row.studentEmail,
      timeOnTaskSeconds: row.timeOnTaskSeconds,
      interactionCount: row.interactionCount,
      completionRate,
      openedMaterials: row.openedMaterials.size,
      completedQuizzes: row.completedQuizzes.size,
    };
  });

  const maxTimeOnTaskSeconds = Math.max(
    0,
    ...rawRows.map((row) => row.timeOnTaskSeconds)
  );
  const maxInteractionCount = Math.max(
    0,
    ...rawRows.map((row) => row.interactionCount)
  );

  const beiRows = rawRows
    .map((row) => {
      const bei = computeBei({
        timeOnTaskSeconds: row.timeOnTaskSeconds,
        completionRate: row.completionRate,
        interactionCount: row.interactionCount,
        maxTimeOnTaskSeconds,
        maxInteractionCount,
      });

      return {
        ...row,
        ...bei,
      };
    })
    .sort((a, b) => b.beiPercent - a.beiPercent);

  const averageBei =
    beiRows.length > 0
      ? Number(
          (
            beiRows.reduce((sum, row) => sum + row.beiPercent, 0) / beiRows.length
          ).toFixed(2)
        )
      : 0;

  return (
    <InstructorShell
      title="Course Analytics"
      description="Behavioral Engagement Index (BEI) per student using normalized time-on-task, completion rate, and interaction frequency."
      sessionEmail={session.email}
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
              Course
            </p>
            <p className="mt-3 text-xl font-bold text-gray-900">
              {course.courseCode ? `${course.courseCode} — ${course.title}` : course.title}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
              Approved Students
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {beiRows.length}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
              Materials + Quizzes
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {totalTrackables}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
              Average BEI
            </p>
            <p className="mt-3 text-3xl font-bold">{averageBei}%</p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                BEI Leaderboard
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Behavioral Engagement Index per Student
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {beiRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                No approved students or no analytics data yet.
              </div>
            ) : (
              beiRows.map((row, index) => (
                <div
                  key={row.studentId}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-500">
                        Student #{index + 1}
                      </p>
                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {row.studentName}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {row.studentEmail}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-right">
                      <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                        BEI
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {row.beiPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <ProgressBar
                      value={row.normalizedTimeOnTask * 100}
                      label="Normalized Time-on-Task"
                    />
                    <ProgressBar
                      value={row.normalizedCompletionRate * 100}
                      label="Normalized Completion Rate"
                    />
                    <ProgressBar
                      value={row.normalizedInteractionFrequency * 100}
                      label="Normalized Interaction Frequency"
                    />
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                        Time-on-Task
                      </p>
                      <p className="mt-2 font-semibold text-gray-900">
                        {row.timeOnTaskSeconds}s
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                        Completion
                      </p>
                      <p className="mt-2 font-semibold text-gray-900">
                        {(row.completionRate * 100).toFixed(2)}%
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                        Opened Materials
                      </p>
                      <p className="mt-2 font-semibold text-gray-900">
                        {row.openedMaterials}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                        Interaction Count
                      </p>
                      <p className="mt-2 font-semibold text-gray-900">
                        {row.interactionCount}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}