import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import EssayReviewForm from "@/components/EssayReviewForm";
import InstructorShell from "@/components/instructor/InstructorShell";

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

  if (
    !quiz ||
    quiz.courseId !== courseId ||
    quiz.course.instructorId !== session.userId
  ) {
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
    <InstructorShell
      title={`${quiz.title} Essay Reviews`}
      description="Review submitted essay responses, add instructor feedback, and assign manual scores."
      actions={[
        {
          label: "Back to Quiz",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}`,
          variant: "secondary",
        },
      ]}
    >
      {essayAnswers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <p className="text-xl font-semibold">No essay answers submitted yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {essayAnswers.map((answer) => (
            <div
              key={answer.id}
              className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-lg font-semibold">{answer.question.questionText}</p>
                  <div className="mt-3 text-sm text-gray-500">
                    <p>
                      Student: {answer.attempt.student.name} (
                      {answer.attempt.student.email})
                    </p>
                    <p>
                      Submitted: {new Date(answer.answeredAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                  ESSAY
                </span>
              </div>

              <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Student Answer
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {answer.selectedAnswer}
                </p>
              </div>

              <EssayReviewForm
                quizAnswerId={answer.id}
                initialScore={answer.manualScore}
                initialFeedback={answer.instructorFeedback}
              />
            </div>
          ))}
        </div>
      )}
    </InstructorShell>
  );
}