import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import EssayReviewForm from "@/components/EssayReviewForm";

export default async function EssayReviewsPage({
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
    },
  });

  if (!quiz || quiz.courseId !== courseId || quiz.course.instructorId !== session.userId) {
    redirect("/login");
  }

  const essayAnswers = await prisma.quizAnswer.findMany({
    where: {
      question: {
        quizId,
        questionType: "ESSAY",
      },
    },
    include: {
      question: true,
      attempt: {
        include: {
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
    orderBy: {
      answeredAt: "desc",
    },
  });

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">{quiz.title} - Essay Reviews</h1>

      <div className="mt-8 space-y-6">
        {essayAnswers.length === 0 ? (
          <p>No essay answers submitted yet.</p>
        ) : (
          essayAnswers.map((answer) => (
            <div key={answer.id} className="rounded border p-4">
              <p className="font-semibold">{answer.question.questionText}</p>

              <div className="mt-3 text-sm text-gray-500">
                <p>
                  Student: {answer.attempt.student.name} ({answer.attempt.student.email})
                </p>
                <p>Submitted: {new Date(answer.answeredAt).toLocaleString()}</p>
              </div>

              <div className="mt-4 rounded bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Student Answer</p>
                <p className="mt-2 whitespace-pre-wrap">{answer.selectedAnswer}</p>
              </div>

              <EssayReviewForm
                quizAnswerId={answer.id}
                initialScore={answer.manualScore}
                initialFeedback={answer.instructorFeedback}
              />
            </div>
          ))
        )}
      </div>
    </main>
  );
}