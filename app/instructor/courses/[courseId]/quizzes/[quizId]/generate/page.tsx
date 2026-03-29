import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import AiQuestionGeneratorForm from "./generator-form";

export default async function GenerateQuestionsPage({
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
  });

  if (!quiz || quiz.courseId !== courseId || quiz.course.instructorId !== session.userId) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title="AI Question Generator"
      description="Generate multiple question types at once, with separate easy, medium, and hard counts for each type."
      actions={[
        {
          label: "Back to Quiz",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}`,
          variant: "secondary",
        },
      ]}
    >
      <AiQuestionGeneratorForm
        courseId={courseId}
        quizId={quizId}
        quizTitle={quiz.title}
      />
    </InstructorShell>
  );
}