import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type QuestionType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Only instructors can add questions." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      quizId?: string;
      questionText?: string;
      questionType?: QuestionType;
      optionA?: string | null;
      optionB?: string | null;
      optionC?: string | null;
      optionD?: string | null;
      correctAnswer?: string | null;
      difficulty?: Difficulty;
      timeThresholdSeconds?: number;
    };

    const {
      quizId,
      questionText,
      questionType,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      difficulty,
      timeThresholdSeconds,
    } = body;

    if (
      !quizId ||
      !questionText?.trim() ||
      !questionType ||
      !difficulty ||
      !timeThresholdSeconds
    ) {
      return NextResponse.json(
        { error: "Required question fields are missing." },
        { status: 400 }
      );
    }

    if (questionType === "ESSAY") {
      return NextResponse.json(
        {
          error:
            "Essay questions are hidden from user access because they are not included in the rule-based adaptive assessment flow.",
        },
        { status: 400 }
      );
    }

    if (
      questionType === "MULTIPLE_CHOICE" &&
      (!optionA?.trim() ||
        !optionB?.trim() ||
        !optionC?.trim() ||
        !optionD?.trim())
    ) {
      return NextResponse.json(
        { error: "All four options are required for multiple choice questions." },
        { status: 400 }
      );
    }

    if (!correctAnswer?.trim()) {
      return NextResponse.json(
        { error: "Correct answer is required for this question type." },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    if (quiz.course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only add questions to your own quiz." },
        { status: 403 }
      );
    }

    const question = await prisma.question.create({
      data: {
        quizId,
        questionText: questionText.trim(),
        questionType,
        optionA: questionType === "MULTIPLE_CHOICE" ? optionA?.trim() || null : null,
        optionB: questionType === "MULTIPLE_CHOICE" ? optionB?.trim() || null : null,
        optionC: questionType === "MULTIPLE_CHOICE" ? optionC?.trim() || null : null,
        optionD: questionType === "MULTIPLE_CHOICE" ? optionD?.trim() || null : null,
        correctAnswer: correctAnswer.trim(),
        difficulty,
        timeThresholdSeconds: Number(timeThresholdSeconds),
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { error: "Failed to create question." },
      { status: 500 }
    );
  }
}
