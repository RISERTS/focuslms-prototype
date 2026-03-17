import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type SubmittedAnswer = {
  questionId: string;
  selectedAnswer: string;
  responseTimeSeconds: number;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isComputationalMatch(expected: string, actual: string): boolean {
  const expectedNum = Number(expected);
  const actualNum = Number(actual);

  if (!Number.isNaN(expectedNum) && !Number.isNaN(actualNum)) {
    return expectedNum === actualNum;
  }

  return normalizeText(expected) === normalizeText(actual);
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      quizId?: string;
      answers?: SubmittedAnswer[];
    };

    const { quizId, answers } = body;

    if (!quizId || !answers?.length) {
      return NextResponse.json(
        { error: "Quiz and answers are required." },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: true,
        questions: true,
        attempts: {
          where: {
            studentId: session.userId,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: quiz.courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "You are not enrolled in this course." },
        { status: 403 }
      );
    }

    if (quiz.attempts.length >= quiz.maxAttempts) {
      return NextResponse.json(
        { error: "Maximum quiz attempts reached." },
        { status: 403 }
      );
    }

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: session.userId,
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });

    let autoGradedCount = 0;
    let correctCount = 0;

    const answerRows = answers.map((answer) => {
      const question = quiz.questions.find((q) => q.id === answer.questionId);

      if (!question) {
        return null;
      }

      let isCorrect = false;
      let isAutoGradable = true;

      if (question.questionType === "MULTIPLE_CHOICE") {
        isCorrect = question.correctAnswer === answer.selectedAnswer;
      } else if (question.questionType === "IDENTIFICATION") {
        isCorrect =
          normalizeText(question.correctAnswer) ===
          normalizeText(answer.selectedAnswer);
      } else if (question.questionType === "COMPUTATIONAL") {
        isCorrect = isComputationalMatch(
          question.correctAnswer,
          answer.selectedAnswer
        );
      } else {
        isAutoGradable = false;
        isCorrect = false;
      }

      if (isAutoGradable) {
        autoGradedCount++;
        if (isCorrect) {
          correctCount++;
        }
      }

      return {
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        responseTimeSeconds: Number(answer.responseTimeSeconds || 0),
        difficultyServed: question.difficulty,
      };
    });

    const validRows = answerRows.filter(
      (row): row is NonNullable<typeof row> => row !== null
    );

    await prisma.quizAnswer.createMany({
      data: validRows,
    });

    const score =
      autoGradedCount > 0 ? (correctCount / autoGradedCount) * 100 : 0;

    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { score },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        courseId: quiz.courseId,
        actionType: "SUBMIT_QUIZ",
        targetId: quiz.id,
        durationSeconds: validRows.reduce(
          (sum, row) => sum + row.responseTimeSeconds,
          0
        ),
      },
    });

    return NextResponse.json({
      message: "Quiz submitted successfully.",
      score,
      note:
        quiz.quizType === "ESSAY" || quiz.quizType === "MIXED"
          ? "Essay answers may require instructor review."
          : undefined,
    });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz." },
      { status: 500 }
    );
  }
}