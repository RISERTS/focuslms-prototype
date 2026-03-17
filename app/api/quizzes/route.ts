import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type QuizType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL"
  | "MIXED";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "INSTRUCTOR") {
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
    };

    const {
      courseId,
      title,
      description,
      maxAttempts,
      questionsPerAttempt,
      shuffleOptions,
      avoidRepeatedQuestions,
      quizType,
      adaptiveMode,
    } = body;

    if (!courseId || !title?.trim()) {
      return NextResponse.json(
        { error: "Course and quiz title are required." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
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

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        title: title.trim(),
        description: description?.trim() || null,
        maxAttempts: maxAttempts && maxAttempts > 0 ? maxAttempts : 3,
        questionsPerAttempt:
          questionsPerAttempt && questionsPerAttempt > 0
            ? questionsPerAttempt
            : null,
        shuffleOptions: shuffleOptions ?? true,
        avoidRepeatedQuestions: avoidRepeatedQuestions ?? true,
        quizType: quizType ?? "MULTIPLE_CHOICE",
        adaptiveMode: adaptiveMode ?? false,
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