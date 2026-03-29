import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import EditQuizSettingsForm from "./quiz-settings-form";

export default async function EditQuizSettingsPage({
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
    include: {
      course: true,
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
      title="Edit Quiz Settings"
      description="Update quiz settings, schedule, and mixed-type composition."
      actions={[
        {
          label: "Back to Quiz",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}`,
          variant: "secondary",
        },
      ]}
    >
      <EditQuizSettingsForm
        courseId={courseId}
        quizId={quizId}
        initialData={{
          title: quiz.title,
          description: quiz.description ?? "",
          quizType: quiz.quizType,
          term: quiz.term,
          maxAttempts: quiz.maxAttempts,
          questionsPerAttempt: quiz.questionsPerAttempt,
          shuffleOptions: quiz.shuffleOptions,
          avoidRepeatedQuestions: quiz.avoidRepeatedQuestions,
          adaptiveMode: quiz.adaptiveMode,
          opensAt: quiz.opensAt ? quiz.opensAt.toISOString() : null,
          closesAt: quiz.closesAt ? quiz.closesAt.toISOString() : null,
          attemptTimeLimitMinutes: quiz.attemptTimeLimitMinutes,

          compositionMode: quiz.compositionMode,
          mcqPercentage: quiz.mcqPercentage,
          identificationPercentage: quiz.identificationPercentage,
          essayPercentage: quiz.essayPercentage,
          computationalPercentage: quiz.computationalPercentage,
          mcqCount: quiz.mcqCount,
          identificationCount: quiz.identificationCount,
          essayCount: quiz.essayCount,
          computationalCount: quiz.computationalCount,
        }}
      />
    </InstructorShell>
  );
}