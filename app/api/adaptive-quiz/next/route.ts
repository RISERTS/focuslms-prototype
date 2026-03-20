import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { nextDifficulty, selectAdaptiveQuestion } from "@/lib/adaptive-quiz";

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
      currentQuestionId?: string;
      selectedAnswer?: string;
      responseTimeSeconds?: number;
      currentAttemptSeenQuestionIds?: string[];
      answeredCount?: number;
    };

    const {
      quizId,
      currentQuestionId,
      selectedAnswer,
      responseTimeSeconds,
      currentAttemptSeenQuestionIds,
      answeredCount,
    } = body;

    if (
      !quizId ||
      !currentQuestionId ||
      !selectedAnswer ||
      !responseTimeSeconds ||
      !currentAttemptSeenQuestionIds ||
      answeredCount === undefined
    ) {
      return NextResponse.json(
        { error: "Missing adaptive quiz fields." },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        attempts: {
          where: { studentId: session.userId },
          include: { answers: true },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    const currentQuestion = quiz.questions.find((q) => q.id === currentQuestionId);

    if (!currentQuestion) {
      return NextResponse.json(
        { error: "Current question not found." },
        { status: 404 }
      );
    }

    let isCorrect = false;
    const expected = currentQuestion.correctAnswer ?? "";

    if (currentQuestion.questionType === "MULTIPLE_CHOICE") {
      isCorrect = expected === selectedAnswer;
    } else if (currentQuestion.questionType === "IDENTIFICATION") {
      isCorrect = normalizeText(expected) === normalizeText(selectedAnswer);
    } else if (currentQuestion.questionType === "COMPUTATIONAL") {
      isCorrect = isComputationalMatch(expected, selectedAnswer);
    }

    const targetDifficulty = nextDifficulty({
      currentDifficulty: currentQuestion.difficulty,
      isCorrect,
      responseTimeSeconds: Number(responseTimeSeconds),
      timeThresholdSeconds: currentQuestion.timeThresholdSeconds,
    });

    const previousSeenQuestionIds = Array.from(
      new Set(
        quiz.attempts.flatMap((attempt) =>
          attempt.answers.map((answer) => answer.questionId)
        )
      )
    );

    const maxItems =
      quiz.questionsPerAttempt && quiz.questionsPerAttempt > 0
        ? Math.min(quiz.questionsPerAttempt, quiz.questions.length)
        : quiz.questions.length;

    const result = {
      questionId: currentQuestion.id,
      selectedAnswer,
      responseTimeSeconds: Number(responseTimeSeconds),
      isCorrect,
      difficultyServed: currentQuestion.difficulty,
    };

    if (answeredCount >= maxItems) {
      return NextResponse.json({
        done: true,
        result,
      });
    }

    const nextQuestion = selectAdaptiveQuestion({
      questions: quiz.questions,
      previousSeenQuestionIds,
      currentAttemptSeenQuestionIds,
      targetDifficulty,
      avoidRepeatedQuestions: quiz.avoidRepeatedQuestions,
      allowEssay: false,
    });

    if (!nextQuestion) {
      return NextResponse.json({
        done: true,
        result,
      });
    }

    return NextResponse.json({
      done: false,
      result,
      nextQuestion,
    });
  } catch (error) {
    console.error("Adaptive quiz next error:", error);
    return NextResponse.json(
      { error: "Failed to compute next adaptive question." },
      { status: 500 }
    );
  }
}