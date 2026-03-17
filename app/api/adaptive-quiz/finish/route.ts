import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type FinalAdaptiveAnswer = {
  questionId: string;
  selectedAnswer: string;
  responseTimeSeconds: number;
  isCorrect: boolean;
  difficultyServed: "EASY" | "MEDIUM" | "HARD";
};

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      quizId?: string;
      courseId?: string;
      answers?: FinalAdaptiveAnswer[];
    };

    const { quizId, courseId, answers } = body;

    if (!quizId || !courseId || !answers?.length) {
      return NextResponse.json(
        { error: "Quiz, course, and answers are required." },
        { status: 400 }
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "You are not enrolled in this course." },
        { status: 403 }
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        attempts: {
          where: { studentId: session.userId },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
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

    await prisma.quizAnswer.createMany({
      data: answers.map((answer) => ({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        responseTimeSeconds: answer.responseTimeSeconds,
        difficultyServed: answer.difficultyServed,
      })),
    });

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = (correctCount / answers.length) * 100;

    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { score },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        courseId,
        actionType: "SUBMIT_QUIZ",
        targetId: quizId,
        durationSeconds: answers.reduce(
          (sum, answer) => sum + answer.responseTimeSeconds,
          0
        ),
      },
    });

    return NextResponse.json({
      message: "Adaptive quiz submitted successfully.",
      score,
    });
  } catch (error) {
    console.error("Adaptive quiz finish error:", error);
    return NextResponse.json(
      { error: "Failed to finish adaptive quiz." },
      { status: 500 }
    );
  }
}