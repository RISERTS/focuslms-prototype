import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { selectQuestionsForAttempt } from "@/lib/quiz-selection";
import AdaptiveQuizClient from "./adaptive-quiz-client";
import TakeQuizClient from "./take-quiz-client";
import StudentShell from "@/components/student/StudentShell";

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
    include: {
      questions: true,
      course: true,
      attempts: {
        where: {
          studentId: session.userId,
        },
        include: {
          answers: true,
        },
      },
    },
  });

  if (!quiz || quiz.courseId !== courseId) {
    redirect("/student/courses");
  }

  const now = new Date();

  if (quiz.opensAt && now < quiz.opensAt) {
    return (
      <StudentShell
        title={quiz.title}
        description={quiz.description || "No description"}
        actions={[
          {
            label: "Back to Course",
            href: `/student/courses/${courseId}`,
            variant: "secondary",
          },
        ]}
      >
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-semibold">This quiz is not yet open.</p>
          <p className="mt-3 text-sm text-gray-600">
            Opens on: {quiz.opensAt.toLocaleString()}
          </p>
        </div>
      </StudentShell>
    );
  }

  if (quiz.closesAt && now > quiz.closesAt) {
    return (
      <StudentShell
        title={quiz.title}
        description={quiz.description || "No description"}
        actions={[
          {
            label: "Back to Course",
            href: `/student/courses/${courseId}`,
            variant: "secondary",
          },
        ]}
      >
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-semibold text-red-600">
            This quiz is already closed.
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Closed on: {quiz.closesAt.toLocaleString()}
          </p>
        </div>
      </StudentShell>
    );
  }

  if (quiz.attempts.length >= quiz.maxAttempts) {
    return (
      <StudentShell
        title={quiz.title}
        description={quiz.description || "No description"}
        actions={[
          {
            label: "Back to Course",
            href: `/student/courses/${courseId}`,
            variant: "secondary",
          },
        ]}
      >
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-semibold text-red-600">
            You have already used all allowed attempts for this quiz.
          </p>
        </div>
      </StudentShell>
    );
  }

  if (quiz.adaptiveMode) {
    return (
      <AdaptiveQuizClient
        quizId={quiz.id}
        courseId={courseId}
        title={quiz.title}
        description={quiz.description}
      />
    );
  }

  const seenQuestionIds = Array.from(
    new Set(
      quiz.attempts.flatMap((attempt) =>
        attempt.answers.map((answer) => answer.questionId)
      )
    )
  );

  const selectedQuestions = selectQuestionsForAttempt({
    allQuestions: quiz.questions,
    seenQuestionIds,
    questionsPerAttempt: quiz.questionsPerAttempt,
    avoidRepeatedQuestions: quiz.avoidRepeatedQuestions,
  });

  return (
    <TakeQuizClient
      courseId={courseId}
      quiz={{
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        shuffleOptions: quiz.shuffleOptions,
        quizType: quiz.quizType,
        attemptTimeLimitMinutes: quiz.attemptTimeLimitMinutes,
        opensAt: quiz.opensAt ? quiz.opensAt.toISOString() : null,
        closesAt: quiz.closesAt ? quiz.closesAt.toISOString() : null,
        questions: selectedQuestions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
        })),
      }}
    />
  );
}