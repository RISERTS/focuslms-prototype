import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
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
      attemptTimeLimitMinutes: true,
      opensAt: true,
      closesAt: true,
    },
  });

  if (!quiz || quiz.courseId !== courseId) {
    redirect("/student/courses");
  }

  return (
    <TakeQuizClient
      courseId={courseId}
      quiz={{
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        attemptTimeLimitMinutes: quiz.attemptTimeLimitMinutes,
        opensAt: quiz.opensAt ? quiz.opensAt.toISOString() : null,
        closesAt: quiz.closesAt ? quiz.closesAt.toISOString() : null,
      }}
    />
  );
}