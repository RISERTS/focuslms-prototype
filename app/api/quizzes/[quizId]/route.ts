import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type QuizType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL"
  | "MIXED";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Only instructors can update quiz settings." },
        { status: 403 }
      );
    }

    const { quizId } = await params;

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      quizType?: QuizType;
      maxAttempts?: number;
      questionsPerAttempt?: number | null;
      shuffleOptions?: boolean;
      avoidRepeatedQuestions?: boolean;
      adaptiveMode?: boolean;
    };

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    if (quiz.course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only update your own quizzes." },
        { status: 403 }
      );
    }

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Quiz title is required." },
        { status: 400 }
      );
    }

    if (
      body.maxAttempts === undefined ||
      Number.isNaN(Number(body.maxAttempts)) ||
      Number(body.maxAttempts) < 1
    ) {
      return NextResponse.json(
        { error: "Maximum attempts must be at least 1." },
        { status: 400 }
      );
    }

    if (
      body.questionsPerAttempt !== null &&
      body.questionsPerAttempt !== undefined &&
      (Number.isNaN(Number(body.questionsPerAttempt)) ||
        Number(body.questionsPerAttempt) < 1)
    ) {
      return NextResponse.json(
        { error: "Items per attempt must be at least 1." },
        { status: 400 }
      );
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        quizType: body.quizType ?? quiz.quizType,
        maxAttempts: Number(body.maxAttempts),
        questionsPerAttempt:
          body.questionsPerAttempt === null ||
          body.questionsPerAttempt === undefined
            ? null
            : Number(body.questionsPerAttempt),
        shuffleOptions: body.shuffleOptions ?? quiz.shuffleOptions,
        avoidRepeatedQuestions:
          body.avoidRepeatedQuestions ?? quiz.avoidRepeatedQuestions,
        adaptiveMode: body.adaptiveMode ?? quiz.adaptiveMode,
      },
    });

    return NextResponse.json(updatedQuiz);
  } catch (error) {
    console.error("Update quiz settings error:", error);
    return NextResponse.json(
      { error: "Failed to update quiz settings." },
      { status: 500 }
    );
  }
}