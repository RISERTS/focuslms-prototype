import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import {
  calculateAttemptScore,
  getNextQuestionForAttempt,
  getTotalQuestionsForAttempt,
} from "@/lib/quiz-attempt-engine";

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seededShuffle<T>(items: T[], seedText: string) {
  const copy = [...items];
  let seed = hashString(seedText) || 123456789;

  const nextRandom = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRandom() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function serializeQuestion(args: {
  attemptId: string;
  shuffleOptions: boolean;
  question: {
    id: string;
    questionText: string;
    questionType: string;
    difficulty: string;
    timeThresholdSeconds: number;
    optionA: string | null;
    optionB: string | null;
    optionC: string | null;
    optionD: string | null;
  };
}) {
  const { attemptId, shuffleOptions, question } = args;

  const options =
    question.questionType === "MULTIPLE_CHOICE"
      ? [
          { key: "A", text: question.optionA ?? "" },
          { key: "B", text: question.optionB ?? "" },
          { key: "C", text: question.optionC ?? "" },
          { key: "D", text: question.optionD ?? "" },
        ]
      : [];

  const finalOptions = shuffleOptions
    ? seededShuffle(options, `${attemptId}:${question.id}`)
    : options;

  return {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    difficulty: question.difficulty,
    timeThresholdSeconds: question.timeThresholdSeconds,
    options: finalOptions,
  };
}

function isCorrectAnswer(args: {
  submittedAnswer: string;
  correctAnswer: string | null;
}) {
  const { submittedAnswer, correctAnswer } = args;
  if (!correctAnswer) return false;
  return normalizeText(submittedAnswer) === normalizeText(correctAnswer);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { attemptId } = await params;

    const body = (await req.json()) as {
      questionId?: string;
      selectedAnswer?: string;
      responseTimeSeconds?: number;
      forceFinish?: boolean;
    };

    const questionId = String(body.questionId || "").trim();
    const selectedAnswer = String(body.selectedAnswer || "");
    const responseTimeSeconds = Math.max(
      0,
      Number(body.responseTimeSeconds || 0)
    );
    const forceFinish = Boolean(body.forceFinish);

    if (!questionId) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 }
      );
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        quizId: true,
        studentId: true,
        startedAt: true,
        finishedAt: true,
        currentQuestionId: true,
        quiz: {
          select: {
            id: true,
            title: true,
            courseId: true,
            quizType: true,
            adaptiveMode: true,
            shuffleOptions: true,
            avoidRepeatedQuestions: true,
            questionsPerAttempt: true,
            attemptTimeLimitMinutes: true,
            compositionMode: true,
            mcqPercentage: true,
            identificationPercentage: true,
            essayPercentage: true,
            computationalPercentage: true,
            mcqCount: true,
            identificationCount: true,
            essayCount: true,
            computationalCount: true,
            questions: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                difficulty: true,
                timeThresholdSeconds: true,
                correctAnswer: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
              },
            },
          },
        },
        answers: {
          orderBy: {
            answeredAt: "asc",
          },
          select: {
            questionId: true,
            selectedAnswer: true,
            responseTimeSeconds: true,
            isCorrect: true,
            question: {
              select: {
                id: true,
                questionType: true,
                difficulty: true,
                timeThresholdSeconds: true,
                correctAnswer: true,
              },
            },
          },
        },
      },
    });

    if (!attempt || attempt.studentId !== session.userId) {
      return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
    }

    if (attempt.finishedAt) {
      return NextResponse.json(
        { error: "This attempt is already finished." },
        { status: 400 }
      );
    }

    if (!attempt.currentQuestionId || attempt.currentQuestionId !== questionId) {
      return NextResponse.json(
        { error: "This is not the current active question." },
        { status: 400 }
      );
    }

    const question = attempt.quiz.questions.find((item) => item.id === questionId);

    if (!question) {
      return NextResponse.json(
        { error: "Question not found in this quiz." },
        { status: 404 }
      );
    }

    const isManualEssay =
      question.questionType === "ESSAY" && question.correctAnswer === null;

    const isCorrect = isManualEssay
      ? false
      : isCorrectAnswer({
          submittedAnswer: selectedAnswer,
          correctAnswer: question.correctAnswer,
        });

    await prisma.quizAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: question.id,
        selectedAnswer,
        isCorrect,
        responseTimeSeconds,
        difficultyServed: question.difficulty,
      },
    });

    const updatedAnswers = [
      ...attempt.answers,
      {
        questionId: question.id,
        selectedAnswer,
        responseTimeSeconds,
        isCorrect,
        question: {
          id: question.id,
          questionType: question.questionType,
          difficulty: question.difficulty,
          timeThresholdSeconds: question.timeThresholdSeconds,
          correctAnswer: question.correctAnswer,
        },
      },
    ];

    const totalQuestions = getTotalQuestionsForAttempt({
      id: attempt.quiz.id,
      quizType: attempt.quiz.quizType,
      adaptiveMode: attempt.quiz.adaptiveMode,
      questionsPerAttempt: attempt.quiz.questionsPerAttempt,
      compositionMode: attempt.quiz.compositionMode,
      mcqPercentage: attempt.quiz.mcqPercentage,
      identificationPercentage: attempt.quiz.identificationPercentage,
      essayPercentage: attempt.quiz.essayPercentage,
      computationalPercentage: attempt.quiz.computationalPercentage,
      mcqCount: attempt.quiz.mcqCount,
      identificationCount: attempt.quiz.identificationCount,
      essayCount: attempt.quiz.essayCount,
      computationalCount: attempt.quiz.computationalCount,
      avoidRepeatedQuestions: attempt.quiz.avoidRepeatedQuestions,
      questions: attempt.quiz.questions.map((item) => ({
        id: item.id,
        questionType: item.questionType,
        difficulty: item.difficulty,
        timeThresholdSeconds: item.timeThresholdSeconds,
        correctAnswer: item.correctAnswer,
      })),
    });

    const historicalAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: attempt.quizId,
        studentId: session.userId,
        id: {
          not: attempt.id,
        },
      },
      select: {
        answers: {
          select: {
            questionId: true,
          },
        },
      },
    });

    const historicalQuestionIds = historicalAttempts.flatMap((pastAttempt) =>
      pastAttempt.answers.map((answer) => answer.questionId)
    );

    const remainingTimeSeconds =
      attempt.quiz.attemptTimeLimitMinutes && attempt.quiz.attemptTimeLimitMinutes > 0
        ? Math.max(
            0,
            attempt.quiz.attemptTimeLimitMinutes * 60 -
              Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
          )
        : null;

    const mustFinish =
      forceFinish ||
      updatedAnswers.length >= totalQuestions ||
      (remainingTimeSeconds !== null && remainingTimeSeconds <= 0);

    if (mustFinish) {
      const score = calculateAttemptScore(updatedAnswers);

      await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          finishedAt: new Date(),
          score,
          currentQuestionId: null,
          currentQuestionStartedAt: null,
        },
      });

      return NextResponse.json({
        finished: true,
        attemptId: attempt.id,
        redirectTo: `/student/courses/${attempt.quiz.courseId}/quizzes/${attempt.quiz.id}/review?attemptId=${attempt.id}`,
      });
    }

    const nextQuestionLite = getNextQuestionForAttempt({
      quiz: {
        id: attempt.quiz.id,
        quizType: attempt.quiz.quizType,
        adaptiveMode: attempt.quiz.adaptiveMode,
        questionsPerAttempt: attempt.quiz.questionsPerAttempt,
        compositionMode: attempt.quiz.compositionMode,
        mcqPercentage: attempt.quiz.mcqPercentage,
        identificationPercentage: attempt.quiz.identificationPercentage,
        essayPercentage: attempt.quiz.essayPercentage,
        computationalPercentage: attempt.quiz.computationalPercentage,
        mcqCount: attempt.quiz.mcqCount,
        identificationCount: attempt.quiz.identificationCount,
        essayCount: attempt.quiz.essayCount,
        computationalCount: attempt.quiz.computationalCount,
        avoidRepeatedQuestions: attempt.quiz.avoidRepeatedQuestions,
        questions: attempt.quiz.questions.map((item) => ({
          id: item.id,
          questionType: item.questionType,
          difficulty: item.difficulty,
          timeThresholdSeconds: item.timeThresholdSeconds,
          correctAnswer: item.correctAnswer,
        })),
      },
      answered: updatedAnswers,
      historicalQuestionIds,
    });

    if (!nextQuestionLite) {
      const score = calculateAttemptScore(updatedAnswers);

      await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          finishedAt: new Date(),
          score,
          currentQuestionId: null,
          currentQuestionStartedAt: null,
        },
      });

      return NextResponse.json({
        finished: true,
        attemptId: attempt.id,
        redirectTo: `/student/courses/${attempt.quiz.courseId}/quizzes/${attempt.quiz.id}/review?attemptId=${attempt.id}`,
      });
    }

    const nextQuestion =
      attempt.quiz.questions.find((item) => item.id === nextQuestionLite.id) ?? null;

    if (!nextQuestion) {
      return NextResponse.json(
        { error: "Unable to load the next question." },
        { status: 500 }
      );
    }

    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        currentQuestionId: nextQuestion.id,
        currentQuestionStartedAt: new Date(),
      },
    });

    return NextResponse.json({
      finished: false,
      attemptId: attempt.id,
      question: serializeQuestion({
        attemptId: attempt.id,
        shuffleOptions: attempt.quiz.shuffleOptions,
        question: nextQuestion,
      }),
      progress: {
        answeredCount: updatedAnswers.length,
        currentNumber: updatedAnswers.length + 1,
        totalQuestions,
      },
      remainingTimeSeconds,
    });
  } catch (error) {
    console.error("Answer current question error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process the answer.",
      },
      { status: 500 }
    );
  }
}