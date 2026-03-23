import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import EditQuestionForm from "./question-form";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string; questionId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  const { courseId, quizId, questionId } = await params;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      quizId: true,
      questionText: true,
      questionType: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      correctAnswer: true,
      difficulty: true,
      timeThresholdSeconds: true,
      quiz: {
        select: {
          courseId: true,
          course: {
            select: {
              instructorId: true,
            },
          },
        },
      },
    },
  });

  if (
    !question ||
    question.quizId !== quizId ||
    question.quiz.courseId !== courseId ||
    question.quiz.course.instructorId !== session.userId
  ) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title="Edit Question"
      description="Update the question text, type, answer fields, and timing."
      actions={[
        {
          label: "Back to Quiz",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}`,
          variant: "secondary",
        },
      ]}
    >
      <EditQuestionForm
        courseId={courseId}
        quizId={quizId}
        questionId={question.id}
        initialData={{
          questionText: question.questionText,
          questionType: question.questionType,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctAnswer: question.correctAnswer,
          difficulty: question.difficulty,
          timeThresholdSeconds: question.timeThresholdSeconds,
        }}
      />
    </InstructorShell>
  );
}