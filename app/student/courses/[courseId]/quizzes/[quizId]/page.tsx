import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { selectQuestionsForAttempt } from "@/lib/quiz-composition";
import TakeQuizClient from "./take-quiz-client";

export default async function StudentTakeQuizPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const { courseId, quizId } = await params;

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

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      courseId: true,
      title: true,
      description: true,
      quizType: true,
      adaptiveMode: true,
      shuffleOptions: true,
      avoidRepeatedQuestions: true,
      maxAttempts: true,
      questionsPerAttempt: true,
      opensAt: true,
      closesAt: true,
      attemptTimeLimitMinutes: true,

      compositionMode: true,
      mcqPercentage: true,
      identificationPercentage: true,
      essayPercentage: true,
      computationalPercentage: true,
      mcqCount: true,
      identificationCount: true,
      essayCount: true,
      computationalCount: true,

      questions: {
        orderBy: {
          difficulty: "asc",
        },
        select: {
          id: true,
          quizId: true,
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          correctAnswer: true,
          difficulty: true,
          timeThresholdSeconds: true,
          questionType: true,
        },
      },
      attempts: {
        where: {
          studentId: session.userId,
        },
        orderBy: {
          startedAt: "desc",
        },
        select: {
          id: true,
          startedAt: true,
          finishedAt: true,
          answers: {
            select: {
              questionId: true,
            },
          },
        },
      },
    },
  });

  if (!quiz || quiz.courseId !== courseId) {
    redirect("/student/courses");
  }

  const now = new Date();

  if (quiz.opensAt && quiz.opensAt > now) {
    return (
      <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 px-6 py-10 text-gray-900">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="mt-3 text-sm text-gray-600">
            This quiz is not yet open.
          </p>
          <p className="mt-2 text-sm text-gray-700">
            Opens at: {quiz.opensAt.toLocaleString()}
          </p>
          <Link
            href={`/student/courses/${courseId}`}
            className="mt-6 inline-flex rounded-xl border border-gray-300 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Back to Course
          </Link>
        </div>
      </main>
    );
  }

  if (quiz.closesAt && quiz.closesAt < now) {
    return (
      <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 px-6 py-10 text-gray-900">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="mt-3 text-sm text-gray-600">
            This quiz is already closed.
          </p>
          <p className="mt-2 text-sm text-gray-700">
            Closed at: {quiz.closesAt.toLocaleString()}
          </p>
          <Link
            href={`/student/courses/${courseId}`}
            className="mt-6 inline-flex rounded-xl border border-gray-300 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Back to Course
          </Link>
        </div>
      </main>
    );
  }

  if (quiz.attempts.length >= quiz.maxAttempts) {
    return (
      <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 px-6 py-10 text-gray-900">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="mt-3 text-sm text-gray-600">
            You have already used all allowed attempts for this quiz.
          </p>
          <Link
            href={`/student/courses/${courseId}`}
            className="mt-6 inline-flex rounded-xl border border-gray-300 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Back to Course
          </Link>
        </div>
      </main>
    );
  }

  const previousQuestionIds = quiz.attempts.flatMap((attempt) =>
    attempt.answers.map((answer) => answer.questionId)
  );

  let selectedQuestions: typeof quiz.questions = [];

  try {
    const selectedLiteQuestions = selectQuestionsForAttempt({
      quiz: {
        quizType: quiz.quizType,
        questionsPerAttempt: quiz.questionsPerAttempt,
        compositionMode: quiz.compositionMode,
        mcqPercentage: quiz.mcqPercentage,
        identificationPercentage: quiz.identificationPercentage,
        essayPercentage: quiz.essayPercentage,
        computationalPercentage: quiz.computationalPercentage,
        mcqCount: quiz.mcqCount,
        identificationCount: quiz.identificationCount,
        essayCount: quiz.essayCount,
        computationalCount: quiz.computationalCount,
        avoidRepeatedQuestions: quiz.avoidRepeatedQuestions,
      },
      questions: quiz.questions.map((question) => ({
        id: question.id,
        questionType: question.questionType,
      })),
      previousQuestionIds,
    });

    selectedQuestions = selectedLiteQuestions
      .map((selected) =>
        quiz.questions.find((question) => question.id === selected.id)
      )
      .filter(
        (
          question
        ): question is (typeof quiz.questions)[number] => question !== undefined
      );
  } catch (error) {
    return (
      <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 px-6 py-10 text-gray-900">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="mt-3 text-sm text-red-700">
            {error instanceof Error
              ? error.message
              : "Unable to build this quiz attempt."}
          </p>
          <Link
            href={`/student/courses/${courseId}`}
            className="mt-6 inline-flex rounded-xl border border-gray-300 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Back to Course
          </Link>
        </div>
      </main>
    );
  }

return (
  <TakeQuizClient
    courseId={courseId}
    quiz={{
      ...quiz,
      opensAt: quiz.opensAt ? quiz.opensAt.toISOString() : null,
      closesAt: quiz.closesAt ? quiz.closesAt.toISOString() : null,
      questions: selectedQuestions,
    }}
  />
);
}