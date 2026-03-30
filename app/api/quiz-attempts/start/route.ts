import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import {
  calculateAttemptScore,
  getNextQuestionForAttempt,
  getTotalQuestionsForAttempt,
} from "@/lib/quiz-attempt-engine";

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

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      quizId?: string;
    };

    const quizId = String(body.quizId || "").trim();

    if (!quizId) {
      return NextResponse.json({ error: "Quiz is required." }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        description: true,
        courseId: true,
        quizType: true,
        adaptiveMode: true,
        shuffleOptions: true,
        avoidRepeatedQuestions: true,
        questionsPerAttempt: true,
        maxAttempts: true,
        opensAt: true,
        closesAt: true,
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
        { error: "You are not allowed to take this quiz." },
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

    const allAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: quiz.id,
        studentId: session.userId,
      },
      select: {
        id: true,
        startedAt: true,
        finishedAt: true,
        currentQuestionId: true,
        currentQuestionStartedAt: true,
        answers: {
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
      orderBy: {
        startedAt: "desc",
      },
    });

    const unfinishedAttempt =
      allAttempts.find((attempt) => !attempt.finishedAt) ?? null;

    const finishedAttempts = allAttempts.filter((attempt) => attempt.finishedAt);
    if (!unfinishedAttempt && finishedAttempts.length >= quiz.maxAttempts) {
      return NextResponse.json(
        { error: "You have already used all allowed attempts." },
        { status: 400 }
      );
    }

    let attempt = unfinishedAttempt;
    let createdNewAttempt = false;

    if (!attempt) {
      attempt = await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          studentId: session.userId,
        },
        select: {
          id: true,
          startedAt: true,
          finishedAt: true,
          currentQuestionId: true,
          currentQuestionStartedAt: true,
          answers: {
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

      createdNewAttempt = true;
    }

    if (createdNewAttempt) {
      await prisma.activityLog.create({
        data: {
          userId: session.userId,
          courseId: quiz.courseId,
          actionType: "START_QUIZ",
          targetId: quiz.id,
        },
      });
    }

    const remainingTimeSeconds =
      quiz.attemptTimeLimitMinutes && quiz.attemptTimeLimitMinutes > 0
        ? Math.max(
            0,
            quiz.attemptTimeLimitMinutes * 60 -
              Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
          )
        : null;

    if (remainingTimeSeconds !== null && remainingTimeSeconds <= 0) {
      const score = calculateAttemptScore(attempt.answers);

      await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          finishedAt: new Date(),
          score,
          currentQuestionId: null,
          currentQuestionStartedAt: null,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.userId,
          courseId: quiz.courseId,
          actionType: "SUBMIT_QUIZ",
          targetId: quiz.id,
          durationSeconds: Math.max(
            0,
            Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
          ),
        },
      });

      return NextResponse.json({
        finished: true,
        attemptId: attempt.id,
        redirectTo: `/student/courses/${quiz.courseId}/quizzes/${quiz.id}/review?attemptId=${attempt.id}`,
      });
    }

    let currentQuestion =
      attempt.currentQuestionId
        ? quiz.questions.find((question) => question.id === attempt.currentQuestionId) ?? null
        : null;

    if (!currentQuestion) {
      const historicalQuestionIds = finishedAttempts.flatMap((pastAttempt) =>
        pastAttempt.answers.map((answer) => answer.questionId)
      );

      const nextQuestion = getNextQuestionForAttempt({
        quiz: {
          id: quiz.id,
          quizType: quiz.quizType,
          adaptiveMode: quiz.adaptiveMode,
          questionsPerAttempt: quiz.questionsPerAttempt,
          compositionMode: quiz.compositionMode,
          mcqPercentage: quiz.mcqPercentage,
          identificationPercentage: quiz.identificationPercentage,
          essayPercentage: quiz.essayPercentage,
          computationalPercentage: quiz.computationalPercentage,
          mcqCount: quiz.mcqCount,
          identificationCount: quiz.identificationCount,
          essayCount: quiz.essayCount,
          computationalCount: quiz.computationalCount,
          avoidRepeatedQuestions: quiz.avoidRepeatedQuestions,
          questions: quiz.questions.map((question) => ({
            id: question.id,
            questionType: question.questionType,
            difficulty: question.difficulty,
            timeThresholdSeconds: question.timeThresholdSeconds,
            correctAnswer: question.correctAnswer,
          })),
        },
        answered: attempt.answers.map((answer) => ({
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          responseTimeSeconds: answer.responseTimeSeconds,
          isCorrect: answer.isCorrect,
          question: {
            id: answer.question.id,
            questionType: answer.question.questionType,
            difficulty: answer.question.difficulty,
            timeThresholdSeconds: answer.question.timeThresholdSeconds,
            correctAnswer: answer.question.correctAnswer,
          },
        })),
        historicalQuestionIds,
      });

      if (!nextQuestion) {
        const score = calculateAttemptScore(attempt.answers);

        await prisma.quizAttempt.update({
          where: { id: attempt.id },
          data: {
            finishedAt: new Date(),
            score,
            currentQuestionId: null,
            currentQuestionStartedAt: null,
          },
        });

        await prisma.activityLog.create({
          data: {
            userId: session.userId,
            courseId: quiz.courseId,
            actionType: "SUBMIT_QUIZ",
            targetId: quiz.id,
            durationSeconds: Math.max(
              0,
              Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
            ),
          },
        });

        return NextResponse.json({
          finished: true,
          attemptId: attempt.id,
          redirectTo: `/student/courses/${quiz.courseId}/quizzes/${quiz.id}/review?attemptId=${attempt.id}`,
        });
      }

      currentQuestion =
        quiz.questions.find((question) => question.id === nextQuestion.id) ?? null;

      if (!currentQuestion) {
        return NextResponse.json(
          { error: "Unable to load the next question." },
          { status: 500 }
        );
      }

      await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          currentQuestionId: currentQuestion.id,
          currentQuestionStartedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      attemptId: attempt.id,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
      },
      question: serializeQuestion({
        attemptId: attempt.id,
        shuffleOptions: quiz.shuffleOptions,
        question: currentQuestion,
      }),
      progress: {
        answeredCount: attempt.answers.length,
        currentNumber: attempt.answers.length + 1,
        totalQuestions: getTotalQuestionsForAttempt({
          id: quiz.id,
          quizType: quiz.quizType,
          adaptiveMode: quiz.adaptiveMode,
          questionsPerAttempt: quiz.questionsPerAttempt,
          compositionMode: quiz.compositionMode,
          mcqPercentage: quiz.mcqPercentage,
          identificationPercentage: quiz.identificationPercentage,
          essayPercentage: quiz.essayPercentage,
          computationalPercentage: quiz.computationalPercentage,
          mcqCount: quiz.mcqCount,
          identificationCount: quiz.identificationCount,
          essayCount: quiz.essayCount,
          computationalCount: quiz.computationalCount,
          avoidRepeatedQuestions: quiz.avoidRepeatedQuestions,
          questions: quiz.questions.map((question) => ({
            id: question.id,
            questionType: question.questionType,
            difficulty: question.difficulty,
            timeThresholdSeconds: question.timeThresholdSeconds,
            correctAnswer: question.correctAnswer,
          })),
        }),
      },
      remainingTimeSeconds,
    });
  } catch (error) {
    console.error("Start quiz attempt error:", error);
    return NextResponse.json(
      { error: "Failed to start quiz attempt." },
      { status: 500 }
    );
  }
}