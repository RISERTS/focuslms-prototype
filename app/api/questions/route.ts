import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type CorrectAnswer = "A" | "B" | "C" | "D";

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
      optionA?: string;
      optionB?: string;
      optionC?: string;
      optionD?: string;
      correctAnswer?: CorrectAnswer;
      difficulty?: Difficulty;
      timeThresholdSeconds?: number;
    };

    const {
      quizId,
      questionText,
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
      !optionA?.trim() ||
      !optionB?.trim() ||
      !optionC?.trim() ||
      !optionD?.trim() ||
      !correctAnswer ||
      !difficulty ||
      !timeThresholdSeconds
    ) {
      return NextResponse.json(
        { error: "All question fields are required." },
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
        optionA: optionA.trim(),
        optionB: optionB.trim(),
        optionC: optionC.trim(),
        optionD: optionD.trim(),
        correctAnswer,
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
