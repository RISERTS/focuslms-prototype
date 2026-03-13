import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export default async function InstructorQuizDetailPage({
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
    include: {
      course: true,
      questions: {
        orderBy: {
          difficulty: "asc",
        },
      },
    },
  });

  if (!quiz || quiz.courseId !== courseId || quiz.course.instructorId !== session.userId) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/instructor/courses/${courseId}/quizzes/${quizId}/add-question`}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Add Question Manually
        </Link>

        <Link
          href={`/instructor/courses/${courseId}/quizzes/${quizId}/generate`}
          className="rounded border px-4 py-2"
        >
          Generate Questions with AI
        </Link>
      </div>

      <h1 className="mt-6 text-3xl font-bold">{quiz.title}</h1>
      <p className="mt-2 text-gray-600">{quiz.description || "No description"}</p>

      <div className="mt-8 space-y-4">
        {quiz.questions.length === 0 ? (
          <p>No questions yet.</p>
        ) : (
          quiz.questions.map((question, index) => (
            <div key={question.id} className="rounded border p-4">
              <p className="font-semibold">
                {index + 1}. {question.questionText}
              </p>
              <div className="mt-2 text-sm">
                <p>A. {question.optionA}</p>
                <p>B. {question.optionB}</p>
                <p>C. {question.optionC}</p>
                <p>D. {question.optionD}</p>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Correct: {question.correctAnswer} | Difficulty: {question.difficulty} | Time: {question.timeThresholdSeconds}s
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
