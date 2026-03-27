import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import GenerateQuestionsForm from "./generate-questions-form";

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

  if (
    !quiz ||
    quiz.courseId !== courseId ||
    quiz.course.instructorId !== session.userId
  ) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title="Generate Questions with AI"
      description="Choose the exact number of easy, medium, and hard questions to generate for this quiz."
      actions={[
        {
          label: "Back to Quiz",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}`,
          variant: "secondary",
        },
      ]}
    >
      <GenerateQuestionsForm
        courseId={courseId}
        quizId={quizId}
        quizTitle={quiz.title}
      />
    </InstructorShell>
  );
}