import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function PATCH(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      quizAnswerId?: string;
      manualScore?: number | null;
      instructorFeedback?: string | null;
    };

    const { quizAnswerId, manualScore, instructorFeedback } = body;

    if (!quizAnswerId) {
      return NextResponse.json(
        { error: "Quiz answer ID is required." },
        { status: 400 }
      );
    }

    if (
      manualScore !== null &&
      manualScore !== undefined &&
      (manualScore < 0 || manualScore > 100)
    ) {
      return NextResponse.json(
        { error: "Manual score must be between 0 and 100." },
        { status: 400 }
      );
    }

    const quizAnswer = await prisma.quizAnswer.findUnique({
      where: { id: quizAnswerId },
      include: {
        attempt: true,
        question: {
          include: {
            quiz: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!quizAnswer) {
      return NextResponse.json(
        { error: "Quiz answer not found." },
        { status: 404 }
      );
    }

    if (quizAnswer.question.quiz.course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only review answers from your own course." },
        { status: 403 }
      );
    }

    const updated = await prisma.quizAnswer.update({
      where: { id: quizAnswerId },
      data: {
        manualScore: manualScore ?? null,
        instructorFeedback: instructorFeedback ?? null,
      },
    });

    const attemptAnswers = await prisma.quizAnswer.findMany({
      where: { attemptId: quizAnswer.attemptId },
      include: {
        question: true,
      },
    });

    const itemScores = attemptAnswers
      .map((answer) => {
        if (answer.question.questionType === "ESSAY") {
          return answer.manualScore ?? null;
        }

        return answer.isCorrect ? 100 : 0;
      })
      .filter((value): value is number => value !== null);

    const recomputedScore =
      itemScores.length > 0
        ? itemScores.reduce((sum, value) => sum + value, 0) / itemScores.length
        : 0;

    await prisma.quizAttempt.update({
      where: { id: quizAnswer.attemptId },
      data: {
        score: recomputedScore,
      },
    });

    return NextResponse.json({
      message: "Essay review saved successfully.",
      updated,
      recomputedScore,
    });
  } catch (error) {
    console.error("Essay review error:", error);
    return NextResponse.json(
      { error: "Failed to save essay review." },
      { status: 500 }
    );
  }
}