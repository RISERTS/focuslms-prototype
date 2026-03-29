import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { computeBei } from "@/lib/bei";
import StudentShell from "@/components/student/StudentShell";

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

export default async function StudentCourseAnalyticsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const { courseId } = await params;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId,
      },
    },
    select: {
      status: true,
    },
  });

  if (!enrollment || enrollment.status !== "APPROVED") {
    redirect("/student/courses");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      courseCode: true,
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
            },
          },
        },
      },
    },
  });

  if (!course) {
    redirect("/student/courses");
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

  const baseRows = studentIds.map((studentId) => ({
    studentId,
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
      timeOnTaskSeconds: row.timeOnTaskSeconds,
      interactionCount: row.interactionCount,
      openedMaterials: row.openedMaterials.size,
      completedQuizzes: row.completedQuizzes.size,
      completionRate,
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

  const myRow =
    rawRows.find((row) => row.studentId === session.userId) ?? {
      studentId: session.userId,
      timeOnTaskSeconds: 0,
      interactionCount: 0,
      openedMaterials: 0,
      completedQuizzes: 0,
      completionRate: 0,
    };

  const bei = computeBei({
    timeOnTaskSeconds: myRow.timeOnTaskSeconds,
    completionRate: myRow.completionRate,
    interactionCount: myRow.interactionCount,
    maxTimeOnTaskSeconds,
    maxInteractionCount,
  });

  return (
    <StudentShell
      title="My Analytics"
      description="Your Behavioral Engagement Index (BEI) based on normalized time-on-task, completion rate, and interaction frequency."
      sessionEmail={session.email}
      actions={[
        {
          label: "Back to Course",
          href: `/student/courses/${courseId}`,
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
              Time-on-Task
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {myRow.timeOnTaskSeconds}s
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
              Interaction Count
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {myRow.interactionCount}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
              My BEI
            </p>
            <p className="mt-3 text-3xl font-bold">{bei.beiPercent.toFixed(2)}%</p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            BEI Components
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Behavioral Engagement Index
          </h2>

          <div className="mt-6 grid gap-5">
            <ProgressBar
              value={bei.normalizedTimeOnTask * 100}
              label="Normalized Time-on-Task"
            />
            <ProgressBar
              value={bei.normalizedCompletionRate * 100}
              label="Normalized Completion Rate"
            />
            <ProgressBar
              value={bei.normalizedInteractionFrequency * 100}
              label="Normalized Interaction Frequency"
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                Opened Materials
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {myRow.openedMaterials}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                Completed Quizzes
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {myRow.completedQuizzes}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                Completion Rate
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {(myRow.completionRate * 100).toFixed(2)}%
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                Total Trackables
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {totalTrackables}
              </p>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}