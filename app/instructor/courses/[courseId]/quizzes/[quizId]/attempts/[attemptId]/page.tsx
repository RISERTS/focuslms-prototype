import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import AttemptReviewView from "@/components/quiz/AttemptReviewView";

export default async function InstructorAttemptDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string; attemptId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  const { courseId, quizId, attemptId } = await params;

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      score: true,
      startedAt: true,
      finishedAt: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: {
            select: {
              instructorId: true,
            },
          },
        },
      },
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
    },
  });

  if (
    !attempt ||
    attempt.quiz.id !== quizId ||
    attempt.quiz.courseId !== courseId ||
    attempt.quiz.course.instructorId !== session.userId
  ) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title={`${attempt.student.name} Attempt Review`}
      description={`${attempt.quiz.title} • ${attempt.student.email}`}
      actions={[
        {
          label: "Back to Attempts",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}/attempts`,
          variant: "secondary",
        },
      ]}
    >
      <AttemptReviewView
        attempt={{
          id: attempt.id,
          score: attempt.score,
          startedAt: attempt.startedAt.toISOString(),
          finishedAt: attempt.finishedAt ? attempt.finishedAt.toISOString() : null,
          answers: attempt.answers,
        }}
        title={attempt.quiz.title}
        subtitle={`Student: ${attempt.student.name}`}
      />
    </InstructorShell>
  );
}