import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type SubmittedAnswer = {
  questionId: string;
  selectedAnswer: "A" | "B" | "C" | "D";
  responseTimeSeconds: number;
};

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

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: session.userId,
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });

    let correctCount = 0;

    await prisma.quizAnswer.createMany({
      data: answers.map((answer) => {
        const question = quiz.questions.find((q) => q.id === answer.questionId);
        const isCorrect = question?.correctAnswer === answer.selectedAnswer;

        if (isCorrect) correctCount++;

        return {
          attemptId: attempt.id,
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: Boolean(isCorrect),
          responseTimeSeconds: Number(answer.responseTimeSeconds || 0),
          difficultyServed: question?.difficulty || "MEDIUM",
        };
      }),
    });

    const score = (correctCount / quiz.questions.length) * 100;

    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { score },
    });

    return NextResponse.json({
      message: "Quiz submitted successfully.",
      score,
    });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz." },
      { status: 500 }
    );
  }
}
