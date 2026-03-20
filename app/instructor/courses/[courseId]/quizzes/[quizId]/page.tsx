import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";

export default async function InstructorQuizDetailPage({
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
      questions: {
        orderBy: {
          difficulty: "asc",
        },
      },
      _count: {
        select: {
          questions: true,
          attempts: true,
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
      title={quiz.title}
      description={quiz.description || "No description"}
      actions={[
        {
          label: "Add Question",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}/add-question`,
          variant: "primary",
        },
        {
          label: "Edit Settings",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}/edit`,
          variant: "secondary",
        },
        {
          label: "Generate with AI",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}/generate`,
          variant: "secondary",
        },
        {
          label: "Review Essay Answers",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}/essay-reviews`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Questions
          </p>
          <p className="mt-3 text-3xl font-bold">{quiz._count.questions}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Attempts
          </p>
          <p className="mt-3 text-3xl font-bold">{quiz._count.attempts}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
            Quiz Type
          </p>
          <p className="mt-3 text-2xl font-bold">{quiz.quizType}</p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Quiz Settings</h2>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-gray-300 px-4 py-2">
            Max Attempts: {quiz.maxAttempts}
          </span>
          <span className="rounded-full border border-gray-300 px-4 py-2">
            Questions per Attempt: {quiz.questionsPerAttempt ?? "All"}
          </span>
          <span className="rounded-full border border-gray-300 px-4 py-2">
            Shuffle: {quiz.shuffleOptions ? "Yes" : "No"}
          </span>
          <span className="rounded-full border border-gray-300 px-4 py-2">
            Avoid Repeats: {quiz.avoidRepeatedQuestions ? "Yes" : "No"}
          </span>
          <span className="rounded-full border border-gray-300 px-4 py-2">
            Adaptive: {quiz.adaptiveMode ? "Yes" : "No"}
          </span>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">Question Bank</h2>

        <div className="mt-6 space-y-4">
          {quiz.questions.length === 0 ? (
            <p className="text-sm text-gray-600">No questions yet.</p>
          ) : (
            quiz.questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-semibold">
                    {index + 1}. {question.questionText}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-black px-3 py-1 font-semibold text-white">
                      {question.questionType}
                    </span>
                    <span className="rounded-full border border-gray-300 px-3 py-1">
                      {question.difficulty}
                    </span>
                    <span className="rounded-full border border-gray-300 px-3 py-1">
                      {question.timeThresholdSeconds}s
                    </span>
                  </div>
                </div>

                {question.questionType === "MULTIPLE_CHOICE" ? (
                  <div className="mt-4 grid gap-2 text-sm text-gray-700">
                    <p>A. {question.optionA}</p>
                    <p>B. {question.optionB}</p>
                    <p>C. {question.optionC}</p>
                    <p>D. {question.optionD}</p>
                    <p className="mt-2 font-medium text-gray-900">
                      Correct Answer: {question.correctAnswer}
                    </p>
                  </div>
                ) : question.questionType === "ESSAY" ? (
                  <p className="mt-4 text-sm text-gray-700">
                    <span className="font-medium text-gray-900">
                      Manual review required
                    </span>
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-gray-700">
                    Expected Answer:{" "}
                    <span className="font-medium text-gray-900">
                      {question.correctAnswer}
                    </span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </InstructorShell>
  );
}