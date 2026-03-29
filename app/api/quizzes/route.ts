import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import {
  normalizeCompositionForSave,
  type QuizCompositionMode,
  type QuizType,
} from "@/lib/quiz-composition";

type TermCategory = "PRELIMS" | "MIDTERMS" | "FINALS";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Only instructors can create quizzes." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      courseId?: string;
      title?: string;
      description?: string;
      maxAttempts?: number;
      questionsPerAttempt?: number | null;
      shuffleOptions?: boolean;
      avoidRepeatedQuestions?: boolean;
      quizType?: QuizType;
      adaptiveMode?: boolean;
      term?: TermCategory;
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

    const courseId = String(body.courseId || "").trim();
    const title = String(body.title || "").trim();

    if (!courseId || !title) {
      return NextResponse.json(
        { error: "Course and quiz title are required." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only create quizzes for your own courses." },
        { status: 403 }
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

    if (opensAtDate && opensAtDate < now) {
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
        quizType: body.quizType ?? "MULTIPLE_CHOICE",
        questionsPerAttempt:
          body.questionsPerAttempt && body.questionsPerAttempt > 0
            ? Number(body.questionsPerAttempt)
            : null,
        compositionMode: body.compositionMode ?? "NONE",
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

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        title,
        description: String(body.description || "").trim() || null,
        maxAttempts:
          body.maxAttempts && body.maxAttempts > 0 ? Number(body.maxAttempts) : 3,
        questionsPerAttempt: composition.questionsPerAttempt,
        shuffleOptions: body.shuffleOptions ?? true,
        avoidRepeatedQuestions: body.avoidRepeatedQuestions ?? true,
        quizType: body.quizType ?? "MULTIPLE_CHOICE",
        adaptiveMode: body.adaptiveMode ?? false,
        term: body.term ?? "PRELIMS",
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

    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error("Create quiz error:", error);
    return NextResponse.json(
      { error: "Failed to create quiz." },
      { status: 500 }
    );
  }
}