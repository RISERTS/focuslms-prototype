import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";

export default async function InstructorQuizAttemptsPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  const { courseId, quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      title: true,
      courseId: true,
      course: {
        select: {
          instructorId: true,
        },
      },
      attempts: {
        orderBy: {
          startedAt: "desc",
        },
        select: {
          id: true,
          startedAt: true,
          finishedAt: true,
          score: true,
          student: {
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

  if (
    !quiz ||
    quiz.courseId !== courseId ||
    quiz.course.instructorId !== session.userId
  ) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title={`${quiz.title} Attempts`}
      description="Review all student attempts for this quiz."
      actions={[
        {
          label: "Back to Quiz",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {quiz.attempts.length === 0 ? (
            <p className="text-sm text-gray-600">No attempts yet.</p>
          ) : (
            quiz.attempts.map((attempt) => (
              <Link
                key={attempt.id}
                href={`/instructor/courses/${courseId}/quizzes/${quizId}/attempts/${attempt.id}`}
                className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{attempt.student.name}</p>
                    <p className="text-sm text-gray-600">{attempt.student.email}</p>
                  </div>

                  <div className="text-sm text-gray-700">
                    <p>Started: {attempt.startedAt.toLocaleString()}</p>
                    <p>
                      Finished:{" "}
                      {attempt.finishedAt
                        ? attempt.finishedAt.toLocaleString()
                        : "Not finished"}
                    </p>
                    <p>
                      Score:{" "}
                      <span className="font-semibold">
                        {attempt.score !== null ? `${attempt.score.toFixed(2)}%` : "-"}
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </InstructorShell>
  );
}