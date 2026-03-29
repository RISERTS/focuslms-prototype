import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function formatDateLabel(value: Date | null) {
  if (!value) return "No schedule";
  return value.toLocaleString();
}

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
        <span className="font-semibold text-gray-900">{value}%</span>
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

export default async function StudentCoursePage({
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
      description: true,
      courseCode: true,
      program: true,
      section: true,
      materials: {
        orderBy: {
          uploadedAt: "desc",
        },
        select: {
          id: true,
          title: true,
          uploadedAt: true,
          fileType: true,
        },
      },
      quizzes: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          opensAt: true,
          closesAt: true,
          maxAttempts: true,
          attempts: {
            where: {
              studentId: session.userId,
              finishedAt: {
                not: null,
              },
            },
            select: {
              id: true,
              score: true,
              finishedAt: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    redirect("/student/courses");
  }

  const materialIds = course.materials.map((material) => material.id);

  const materialOpenLogs =
    materialIds.length > 0
      ? await prisma.activityLog.findMany({
          where: {
            userId: session.userId,
            courseId,
            actionType: "OPEN_MATERIAL",
            targetId: {
              in: materialIds,
            },
          },
          select: {
            targetId: true,
          },
        })
      : [];

  const openedMaterialIds = new Set(
    materialOpenLogs
      .map((log) => log.targetId)
      .filter((targetId): targetId is string => Boolean(targetId))
  );

  const completedQuizIds = new Set(
    course.quizzes
      .filter((quiz) => quiz.attempts.length > 0)
      .map((quiz) => quiz.id)
  );

  const materialCompletion = percent(
    openedMaterialIds.size,
    course.materials.length
  );

  const quizCompletion = percent(
    completedQuizIds.size,
    course.quizzes.length
  );

  const totalTrackables = course.materials.length + course.quizzes.length;
  const totalCompleted = openedMaterialIds.size + completedQuizIds.size;
  const overallProgress = percent(totalCompleted, totalTrackables);

  return (
    <StudentShell
      title={course.title}
      description="View course materials, quizzes, and your current completion progress."
      actions={[
        {
          label: "Back to Courses",
          href: "/student/courses",
          variant: "secondary",
        },
      ]}
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Course Overview
                </p>
                <h2 className="mt-3 text-3xl font-bold text-gray-900">
                  {course.courseCode ? `${course.courseCode} — ${course.title}` : course.title}
                </h2>
                {course.description && (
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
                    {course.description}
                  </p>
                )}
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                    Program
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {course.program || "Not set"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                    Section
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {course.section || "Not set"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
              Your Progress
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-gray-300">Overall Course Progress</p>
              <p className="mt-2 text-4xl font-bold">{overallProgress}%</p>
              <p className="mt-2 text-sm text-gray-300">
                {totalCompleted} of {totalTrackables} tracked items completed
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <ProgressBar value={materialCompletion} label="Materials Opened" />
              <ProgressBar value={quizCompletion} label="Quizzes Completed" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                Materials
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900">
                Course Materials
              </h3>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
              {openedMaterialIds.size} / {course.materials.length} opened
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {course.materials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                No materials available yet.
              </div>
            ) : (
              course.materials.map((material) => {
                const opened = openedMaterialIds.has(material.id);

                return (
                  <Link
                    key={material.id}
                    href={`/student/courses/${courseId}/materials/${material.id}`}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-black hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {material.title}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          Uploaded: {material.uploadedAt.toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          Type: {material.fileType}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {opened ? (
                          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Completed
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Not yet opened
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                Quizzes
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900">
                Course Quizzes
              </h3>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
              {completedQuizIds.size} / {course.quizzes.length} completed
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {course.quizzes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                No quizzes available yet.
              </div>
            ) : (
              course.quizzes.map((quiz) => {
                const completed = completedQuizIds.has(quiz.id);
                const latestAttempt =
                  quiz.attempts.length > 0 ? quiz.attempts[0] : null;

                return (
                  <Link
                    key={quiz.id}
                    href={`/student/courses/${courseId}/quizzes/${quiz.id}`}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-black hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {quiz.title}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          Opens: {formatDateLabel(quiz.opensAt)}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          Closes: {formatDateLabel(quiz.closesAt)}
                        </p>

                        {latestAttempt && (
                          <p className="mt-2 text-sm font-medium text-gray-900">
                            Latest score: {(latestAttempt.score ?? 0).toFixed(2)}%
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {completed ? (
                          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Completed
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Not yet answered
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
