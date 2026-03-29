import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import {
  normalizeCompositionForSave,
  type QuizCompositionMode,
  type QuizType,
} from "@/lib/quiz-composition";

type TermCategory = "PRELIMS" | "MIDTERMS" | "FINALS";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
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
      term?: TermCategory;
      maxAttempts?: number;
      questionsPerAttempt?: number | null;
      shuffleOptions?: boolean;
      avoidRepeatedQuestions?: boolean;
      adaptiveMode?: boolean;
      opensAt?: string | null;
      closesAt?: string | null;
      attemptTimeLimitMinutes?: number | null;

      compositionMode?: QuizCompositionMode;
      mcqPercentage?: number | null;
      identificationPercentage?: number | null;
      essayPercentage?: number | null;
      computationalPercentage?: number | null;
      mcqCount?: number | null;
      identificationCount?: number | null;
      essayCount?: number | null;
      computationalCount?: number | null;
    };

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        quizType: true,
        term: true,
        maxAttempts: true,
        shuffleOptions: true,
        avoidRepeatedQuestions: true,
        adaptiveMode: true,
        opensAt: true,
        compositionMode: true,
        course: {
          select: {
            instructorId: true,
          },
        },
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

    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json(
        { error: "Quiz title is required." },
        { status: 400 }
      );
    }

    const opensAtDate = body.opensAt ? new Date(body.opensAt) : null;
    const closesAtDate = body.closesAt ? new Date(body.closesAt) : null;
    const now = new Date();

    if (opensAtDate && Number.isNaN(opensAtDate.getTime())) {
      return NextResponse.json({ error: "Invalid open date/time." }, { status: 400 });
    }

    if (closesAtDate && Number.isNaN(closesAtDate.getTime())) {
      return NextResponse.json({ error: "Invalid close date/time." }, { status: 400 });
    }

    if (
      opensAtDate &&
      opensAtDate < now &&
      (!quiz.opensAt || opensAtDate.getTime() !== quiz.opensAt.getTime())
    ) {
      return NextResponse.json(
        { error: "Open date/time cannot be in the past." },
        { status: 400 }
      );
    }

    if (opensAtDate && closesAtDate && closesAtDate <= opensAtDate) {
      return NextResponse.json(
        { error: "Close date/time must be after the open date/time." },
        { status: 400 }
      );
    }

    let composition;
    try {
      composition = normalizeCompositionForSave({
        quizType: body.quizType ?? quiz.quizType,
        questionsPerAttempt:
          body.questionsPerAttempt === null || body.questionsPerAttempt === undefined
            ? null
            : body.questionsPerAttempt > 0
            ? Number(body.questionsPerAttempt)
            : null,
        compositionMode: body.compositionMode ?? quiz.compositionMode,
        mcqPercentage: body.mcqPercentage ?? null,
        identificationPercentage: body.identificationPercentage ?? null,
        essayPercentage: body.essayPercentage ?? null,
        computationalPercentage: body.computationalPercentage ?? null,
        mcqCount: body.mcqCount ?? null,
        identificationCount: body.identificationCount ?? null,
        essayCount: body.essayCount ?? null,
        computationalCount: body.computationalCount ?? null,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid mixed quiz configuration.",
        },
        { status: 400 }
      );
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title,
        description: String(body.description || "").trim() || null,
        quizType: body.quizType ?? quiz.quizType,
        term: body.term ?? quiz.term,
        maxAttempts:
          body.maxAttempts && body.maxAttempts > 0
            ? Number(body.maxAttempts)
            : quiz.maxAttempts,
        questionsPerAttempt: composition.questionsPerAttempt,
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

        compositionMode: composition.compositionMode,
        mcqPercentage: composition.mcqPercentage,
        identificationPercentage: composition.identificationPercentage,
        essayPercentage: composition.essayPercentage,
        computationalPercentage: composition.computationalPercentage,
        mcqCount: composition.mcqCount,
        identificationCount: composition.identificationCount,
        essayCount: composition.essayCount,
        computationalCount: composition.computationalCount,
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