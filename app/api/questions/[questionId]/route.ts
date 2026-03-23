import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type QuestionType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { questionId } = await params;

    const body = (await req.json()) as {
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

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        quizId: true,
        quiz: {
          select: {
            course: {
              select: {
                instructorId: true,
              },
            },
          },
        },
      },
    });

    if (!question || question.quiz.course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 }
      );
    }

    if (
      !body.questionText?.trim() ||
      !body.questionType ||
      !body.difficulty ||
      !body.timeThresholdSeconds
    ) {
      return NextResponse.json(
        { error: "Required question fields are missing." },
        { status: 400 }
      );
    }

    if (
      body.questionType === "MULTIPLE_CHOICE" &&
      (!body.optionA?.trim() ||
        !body.optionB?.trim() ||
        !body.optionC?.trim() ||
        !body.optionD?.trim())
    ) {
      return NextResponse.json(
        { error: "All four options are required for multiple choice questions." },
        { status: 400 }
      );
    }

    if (
      body.questionType !== "ESSAY" &&
      (!body.correctAnswer || !body.correctAnswer.trim())
    ) {
      return NextResponse.json(
        { error: "Correct answer is required for this question type." },
        { status: 400 }
      );
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: {
        questionText: body.questionText.trim(),
        questionType: body.questionType,
        optionA: body.questionType === "MULTIPLE_CHOICE" ? body.optionA?.trim() || null : null,
        optionB: body.questionType === "MULTIPLE_CHOICE" ? body.optionB?.trim() || null : null,
        optionC: body.questionType === "MULTIPLE_CHOICE" ? body.optionC?.trim() || null : null,
        optionD: body.questionType === "MULTIPLE_CHOICE" ? body.optionD?.trim() || null : null,
        correctAnswer:
          body.questionType === "ESSAY" ? null : body.correctAnswer?.trim() || null,
        difficulty: body.difficulty,
        timeThresholdSeconds: Number(body.timeThresholdSeconds),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update question error:", error);
    return NextResponse.json(
      { error: "Failed to update question." },
      { status: 500 }
    );
  }
}