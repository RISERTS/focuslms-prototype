import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { selectAdaptiveQuestion } from "@/lib/adaptive-quiz";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      quizId?: string;
      courseId?: string;
    };

    const { quizId, courseId } = body;

    if (!quizId || !courseId) {
      return NextResponse.json(
        { error: "Quiz ID and course ID are required." },
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
        questions: true,
        attempts: {
          where: { studentId: session.userId },
          include: { answers: true },
        },
      },
    });

    if (!quiz || quiz.courseId !== courseId) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    if (!quiz.adaptiveMode) {
      return NextResponse.json(
        { error: "This quiz is not in adaptive mode." },
        { status: 400 }
      );
    }

    if (quiz.attempts.length >= quiz.maxAttempts) {
      return NextResponse.json(
        { error: "Maximum quiz attempts reached." },
        { status: 403 }
      );
    }

    const previousSeenQuestionIds = Array.from(
      new Set(
        quiz.attempts.flatMap((attempt) =>
          attempt.answers.map((answer) => answer.questionId)
        )
      )
    );

    const firstQuestion = selectAdaptiveQuestion({
      questions: quiz.questions,
      previousSeenQuestionIds,
      currentAttemptSeenQuestionIds: [],
      targetDifficulty: "MEDIUM",
      avoidRepeatedQuestions: quiz.avoidRepeatedQuestions,
      allowEssay: false,
    });

    if (!firstQuestion) {
      return NextResponse.json(
        { error: "No available adaptive questions found." },
        { status: 400 }
      );
    }

    const maxItems =
      quiz.questionsPerAttempt && quiz.questionsPerAttempt > 0
        ? Math.min(quiz.questionsPerAttempt, quiz.questions.length)
        : quiz.questions.length;

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        shuffleOptions: quiz.shuffleOptions,
        maxItems,
      },
      firstQuestion,
    });
  } catch (error) {
    console.error("Adaptive quiz start error:", error);
    return NextResponse.json(
      { error: "Failed to start adaptive quiz." },
      { status: 500 }
    );
  }
}