import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type SubmittedAnswer = {
  questionId?: string;
  selectedAnswer?: string;
  responseTimeSeconds?: number;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function isCorrectAnswer(args: {
  questionType: string;
  submittedAnswer: string;
  correctAnswer: string | null;
}) {
  const { submittedAnswer, correctAnswer } = args;

  if (!correctAnswer) return false;

  return normalizeText(submittedAnswer) === normalizeText(correctAnswer);
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      quizId?: string;
      startedAt?: string;
      answers?: SubmittedAnswer[];
    };

    const quizId = String(body.quizId || "").trim();
    const submittedAnswers = Array.isArray(body.answers) ? body.answers : [];

    if (!quizId) {
      return NextResponse.json({ error: "Quiz is required." }, { status: 400 });
    }

    if (submittedAnswers.length === 0) {
      return NextResponse.json(
        { error: "No answers were submitted." },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        courseId: true,
        maxAttempts: true,
        opensAt: true,
        closesAt: true,
        attemptTimeLimitMinutes: true,
        questions: {
          select: {
            id: true,
            questionType: true,
            correctAnswer: true,
            difficulty: true,
          },
        },
        attempts: {
          where: {
            studentId: session.userId,
          },
          select: {
            id: true,
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
      select: {
        status: true,
      },
    });

    if (!enrollment || enrollment.status !== "APPROVED") {
      return NextResponse.json(
        { error: "You are not allowed to submit this quiz." },
        { status: 403 }
      );
    }

    const now = new Date();

    if (quiz.opensAt && quiz.opensAt > now) {
      return NextResponse.json(
        { error: "This quiz is not yet open." },
        { status: 400 }
      );
    }

    if (quiz.closesAt && quiz.closesAt < now) {
      return NextResponse.json(
        { error: "This quiz is already closed." },
        { status: 400 }
      );
    }

    if (quiz.attempts.length >= quiz.maxAttempts) {
      return NextResponse.json(
        { error: "You have already used all allowed attempts." },
        { status: 400 }
      );
    }

    const startedAt =
      body.startedAt && !Number.isNaN(new Date(body.startedAt).getTime())
        ? new Date(body.startedAt)
        : new Date();

    const finishedAt = new Date();

    const questionMap = new Map(
      quiz.questions.map((question) => [question.id, question])
    );

    let autoGradedCount = 0;
    let correctCount = 0;

    const preparedAnswers = submittedAnswers.map((answer, index) => {
      const questionId = String(answer.questionId || "").trim();
      const selectedAnswer = String(answer.selectedAnswer || "").trim();
      const responseTimeSeconds = Math.max(
        0,
        Number(answer.responseTimeSeconds || 0)
      );

      const question = questionMap.get(questionId);

      if (!question) {
        throw new Error(`Submitted question ${index + 1} is invalid.`);
      }

      const isEssayManual =
        question.questionType === "ESSAY" && question.correctAnswer === null;

      let isCorrect = false;

      if (!isEssayManual) {
        autoGradedCount += 1;
        isCorrect = isCorrectAnswer({
          questionType: question.questionType,
          submittedAnswer: selectedAnswer,
          correctAnswer: question.correctAnswer,
        });

        if (isCorrect) {
          correctCount += 1;
        }
      }

      return {
        questionId: question.id,
        selectedAnswer,
        isCorrect,
        responseTimeSeconds,
        difficultyServed: question.difficulty,
      };
    });

    const score =
      autoGradedCount > 0 ? (correctCount / autoGradedCount) * 100 : 0;

    const createdAttempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        studentId: session.userId,
        startedAt,
        finishedAt,
        score,
        answers: {
          create: preparedAnswers,
        },
      },
      select: {
        id: true,
        score: true,
      },
    });

    return NextResponse.json({
      message: "Quiz submitted successfully.",
      attemptId: createdAttempt.id,
      score: createdAttempt.score ?? 0,
      percentage: createdAttempt.score ?? 0,
    });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit quiz.",
      },
      { status: 500 }
    );
  }
}