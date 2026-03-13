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
  });

  if (!enrollment) {
    redirect("/student/courses");
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: true,
      course: true,
    },
  });

  if (!quiz || quiz.courseId !== courseId) {
    redirect("/student/courses");
  }

  return <TakeQuizClient quiz={quiz} />;
}
