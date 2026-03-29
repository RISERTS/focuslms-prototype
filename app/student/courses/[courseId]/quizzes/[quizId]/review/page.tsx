import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";

function formatAnswer(args: {
  questionType: string;
  selectedAnswer: string | null;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
}) {
  const { questionType, selectedAnswer, optionA, optionB, optionC, optionD } = args;

  if (!selectedAnswer) return "No answer";

  if (questionType !== "MULTIPLE_CHOICE") {
    return selectedAnswer;
  }

  const upper = selectedAnswer.toUpperCase();

  if (upper === "A") return `A. ${optionA ?? ""}`;
  if (upper === "B") return `B. ${optionB ?? ""}`;
  if (upper === "C") return `C. ${optionC ?? ""}`;
  if (upper === "D") return `D. ${optionD ?? ""}`;

  return selectedAnswer;
}

function formatCorrectAnswer(args: {
  questionType: string;
  correctAnswer: string | null;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
}) {
  const { questionType, correctAnswer, optionA, optionB, optionC, optionD } = args;

  if (questionType === "ESSAY" && !correctAnswer) {
    return "Manual review required";
  }

  if (!correctAnswer) {
    return "No correct answer set";
  }

  if (questionType !== "MULTIPLE_CHOICE") {
    return correctAnswer;
  }

  const upper = correctAnswer.toUpperCase();

  if (upper === "A") return `A. ${optionA ?? ""}`;
  if (upper === "B") return `B. ${optionB ?? ""}`;
  if (upper === "C") return `C. ${optionC ?? ""}`;
  if (upper === "D") return `D. ${optionD ?? ""}`;

  return correctAnswer;
}

export default async function StudentQuizReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const { courseId, quizId } = await params;
  const { attemptId } = await searchParams;

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

  const attempt = attemptId
    ? await prisma.quizAttempt.findFirst({
        where: {
          id: attemptId,
          quizId,
          studentId: session.userId,
          quiz: {
            courseId,
          },
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              courseId: true,
            },
          },
          answers: {
            orderBy: {
              answeredAt: "asc",
            },
            include: {
              question: {
                select: {
                  id: true,
                  questionText: true,
                  questionType: true,
                  optionA: true,
                  optionB: true,
                  optionC: true,
                  optionD: true,
                  correctAnswer: true,
                },
              },
            },
          },
        },
      })
    : await prisma.quizAttempt.findFirst({
        where: {
          quizId,
          studentId: session.userId,
          finishedAt: {
            not: null,
          },
          quiz: {
            courseId,
          },
        },
        orderBy: {
          finishedAt: "desc",
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              courseId: true,
            },
          },
          answers: {
            orderBy: {
              answeredAt: "asc",
            },
            include: {
              question: {
                select: {
                  id: true,
                  questionText: true,
                  questionType: true,
                  optionA: true,
                  optionB: true,
                  optionC: true,
                  optionD: true,
                  correctAnswer: true,
                },
              },
            },
          },
        },
      });

  if (!attempt) {
    redirect(`/student/courses/${courseId}/quizzes/${quizId}`);
  }

  const autoGradedAnswers = attempt.answers.filter(
    (answer) =>
      !(
        answer.question.questionType === "ESSAY" &&
        answer.question.correctAnswer === null
      )
  );

  const correctCount = autoGradedAnswers.filter((answer) => answer.isCorrect).length;
  const totalAutoGraded = autoGradedAnswers.length;
  const percentage = attempt.score ?? 0;

  return (
    <StudentShell
      title={`${attempt.quiz.title} Review`}
      description="See your score, percentage, and detailed question-by-question review."
      sessionEmail={session.email}
      actions={[
        {
          label: "Back to Course",
          href: `/student/courses/${courseId}`,
          variant: "secondary",
        },
        {
          label: "Back to Quiz",
          href: `/student/courses/${courseId}/quizzes/${quizId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Score
          </p>
          <p className="mt-3 text-3xl font-bold">
            {correctCount} / {totalAutoGraded}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Percentage
          </p>
          <p className="mt-3 text-3xl font-bold">{percentage.toFixed(2)}%</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Finished At
          </p>
          <p className="mt-3 text-sm font-medium text-gray-900">
            {attempt.finishedAt
              ? attempt.finishedAt.toLocaleString()
              : "Not finished"}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
            Attempt ID
          </p>
          <p className="mt-3 break-all text-sm font-medium">{attempt.id}</p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">Question Review</h2>

        <div className="mt-6 space-y-4">
          {attempt.answers.map((answer, index) => {
            const isEssayManual =
              answer.question.questionType === "ESSAY" &&
              answer.question.correctAnswer === null;

            return (
              <div
                key={answer.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {index + 1}. {answer.question.questionText}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-black px-3 py-1 font-semibold text-white">
                        {answer.question.questionType}
                      </span>

                      {isEssayManual ? (
                        <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                          Manual Review
                        </span>
                      ) : answer.isCorrect ? (
                        <span className="rounded-full border border-green-300 bg-green-50 px-3 py-1 font-semibold text-green-700">
                          Correct
                        </span>
                      ) : (
                        <span className="rounded-full border border-red-300 bg-red-50 px-3 py-1 font-semibold text-red-700">
                          Incorrect
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Your Answer</p>
                    <p className="mt-1 text-gray-700">
                      {formatAnswer({
                        questionType: answer.question.questionType,
                        selectedAnswer: answer.selectedAnswer,
                        optionA: answer.question.optionA,
                        optionB: answer.question.optionB,
                        optionC: answer.question.optionC,
                        optionD: answer.question.optionD,
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-gray-900">
                      {isEssayManual ? "Review Status" : "Correct Answer"}
                    </p>
                    <p className="mt-1 text-gray-700">
                      {formatCorrectAnswer({
                        questionType: answer.question.questionType,
                        correctAnswer: answer.question.correctAnswer,
                        optionA: answer.question.optionA,
                        optionB: answer.question.optionB,
                        optionC: answer.question.optionC,
                        optionD: answer.question.optionD,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StudentShell>
  );
}