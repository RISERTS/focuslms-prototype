import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";

export default async function InstructorQuizListPage({
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
      quizzes: {
        include: {
          _count: {
            select: {
              questions: true,
              attempts: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!course || course.instructorId !== session.userId) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title={`${course.title} Quizzes`}
      description="Create, review, and manage quizzes for this course."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${course.id}`,
          variant: "secondary",
        },
        {
          label: "Create Quiz",
          href: `/instructor/courses/${course.id}/quizzes/create`,
          variant: "primary",
        },
      ]}
    >
      {course.quizzes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <p className="text-xl font-semibold">No quizzes yet</p>
          <p className="mt-3 text-sm text-gray-600">
            Create the first quiz for this course.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {course.quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/instructor/courses/${course.id}/quizzes/${quiz.id}`}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{quiz.title}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {quiz.description || "No description"}
                  </p>
                </div>

                <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                  {quiz.quizType}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                    Questions
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {quiz._count.questions}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                    Attempts
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {quiz._count.attempts}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="rounded-full border border-gray-300 px-3 py-1">
                  Max Attempts: {quiz.maxAttempts}
                </span>
                <span className="rounded-full border border-gray-300 px-3 py-1">
                  Adaptive: {quiz.adaptiveMode ? "Yes" : "No"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </InstructorShell>
  );
}