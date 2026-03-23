import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";
import AttemptReviewView from "@/components/quiz/AttemptReviewView";

export default async function StudentLatestAttemptReviewPage({
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

  const latestAttempt = await prisma.quizAttempt.findFirst({
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
    select: {
      id: true,
      score: true,
      startedAt: true,
      finishedAt: true,
      answers: {
        orderBy: {
          answeredAt: "asc",
        },
        select: {
          id: true,
          selectedAnswer: true,
          isCorrect: true,
          responseTimeSeconds: true,
          manualScore: true,
          instructorFeedback: true,
          question: {
            select: {
              id: true,
              questionText: true,
              questionType: true,
              correctAnswer: true,
            },
          },
        },
      },
      quiz: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!latestAttempt) {
    redirect(`/student/courses/${courseId}`);
  }

  return (
    <StudentShell
      title={`Review Latest Attempt`}
      description={`Quiz: ${latestAttempt.quiz.title}`}
      sessionEmail={session.email}
      actions={[
        {
          label: "Back to Course",
          href: `/student/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <AttemptReviewView
        attempt={{
          id: latestAttempt.id,
          score: latestAttempt.score,
          startedAt: latestAttempt.startedAt.toISOString(),
          finishedAt: latestAttempt.finishedAt
            ? latestAttempt.finishedAt.toISOString()
            : null,
          answers: latestAttempt.answers,
        }}
        title={latestAttempt.quiz.title}
        subtitle="You can review only your most recent finished attempt."
      />
    </StudentShell>
  );
}