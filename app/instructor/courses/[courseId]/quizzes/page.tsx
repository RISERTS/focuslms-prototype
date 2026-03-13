import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

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
          questions: true,
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
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{course.title} - Quizzes</h1>
          <p className="mt-2 text-gray-600">
            {course.description || "No description"}
          </p>
        </div>

        <Link
          href={`/instructor/courses/${course.id}/quizzes/create`}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Create Quiz
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {course.quizzes.length === 0 ? (
          <p>No quizzes yet.</p>
        ) : (
          course.quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/instructor/courses/${course.id}/quizzes/${quiz.id}`}
              className="block rounded border p-4"
            >
              <h2 className="text-xl font-semibold">{quiz.title}</h2>
              <p className="mt-2 text-gray-600">
                {quiz.description || "No description"}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Questions: {quiz.questions.length}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
