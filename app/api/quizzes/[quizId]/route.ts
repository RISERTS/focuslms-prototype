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
      opensAt?: string | null;
      closesAt?: string | null;
      attemptTimeLimitMinutes?: number | null;
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

    const opensAtDate = body.opensAt ? new Date(body.opensAt) : null;
    const closesAtDate = body.closesAt ? new Date(body.closesAt) : null;

    if (opensAtDate && Number.isNaN(opensAtDate.getTime())) {
      return NextResponse.json({ error: "Invalid open date/time." }, { status: 400 });
    }

    if (closesAtDate && Number.isNaN(closesAtDate.getTime())) {
      return NextResponse.json({ error: "Invalid close date/time." }, { status: 400 });
    }

    if (opensAtDate && closesAtDate && closesAtDate <= opensAtDate) {
      return NextResponse.json(
        { error: "Close date/time must be after the open date/time." },
        { status: 400 }
      );
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        quizType: body.quizType ?? quiz.quizType,
        maxAttempts:
          body.maxAttempts && body.maxAttempts > 0
            ? Number(body.maxAttempts)
            : quiz.maxAttempts,
        questionsPerAttempt:
          body.questionsPerAttempt === null || body.questionsPerAttempt === undefined
            ? null
            : Number(body.questionsPerAttempt),
        shuffleOptions: body.shuffleOptions ?? quiz.shuffleOptions,
        avoidRepeatedQuestions:
          body.avoidRepeatedQuestions ?? quiz.avoidRepeatedQuestions,
        adaptiveMode: body.adaptiveMode ?? quiz.adaptiveMode,
        opensAt: opensAtDate,
        closesAt: closesAtDate,
        attemptTimeLimitMinutes:
          body.attemptTimeLimitMinutes && body.attemptTimeLimitMinutes > 0
            ? Number(body.attemptTimeLimitMinutes)
            : null,
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