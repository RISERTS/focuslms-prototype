import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type CorrectAnswer = "A" | "B" | "C" | "D";

type DraftQuestion = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: CorrectAnswer;
  difficulty: Difficulty;
  timeThresholdSeconds: number;
  selected: boolean;
};

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Only instructors can save generated questions." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      quizId?: string;
      questions?: DraftQuestion[];
    };

    const { quizId, questions } = body;

    if (!quizId || !questions?.length) {
      return NextResponse.json(
        { error: "Quiz ID and questions are required." },
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
        { error: "You can only save questions to your own quiz." },
        { status: 403 }
      );
    }

    const selectedQuestions = questions.filter((q) => q.selected);

    if (selectedQuestions.length === 0) {
      return NextResponse.json(
        { error: "Select at least one question to save." },
        { status: 400 }
      );
    }

    await prisma.question.createMany({
      data: selectedQuestions.map((q) => ({
        quizId,
        questionText: q.questionText.trim(),
        optionA: q.optionA.trim(),
        optionB: q.optionB.trim(),
        optionC: q.optionC.trim(),
        optionD: q.optionD.trim(),
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
        timeThresholdSeconds: Number(q.timeThresholdSeconds),
      })),
    });

    return NextResponse.json({ message: "Questions saved successfully." });
  } catch (error) {
    console.error("Save generated questions error:", error);
    return NextResponse.json(
      { error: "Failed to save generated questions." },
      { status: 500 }
    );
  }
}
