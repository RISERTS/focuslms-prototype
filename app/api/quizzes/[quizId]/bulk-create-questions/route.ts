import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type QuestionType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL";

type IncomingQuestion = {
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

function isValidDifficulty(value: string): value is Difficulty {
  return value === "EASY" || value === "MEDIUM" || value === "HARD";
}

function isValidQuestionType(value: string): value is QuestionType {
  return (
    value === "MULTIPLE_CHOICE" ||
    value === "IDENTIFICATION" ||
    value === "ESSAY" ||
    value === "COMPUTATIONAL"
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { quizId } = await params;

    const body = (await req.json()) as {
      questions?: IncomingQuestion[];
    };

    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json(
        { error: "Questions are required." },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        course: {
          select: {
            instructorId: true,
          },
        },
      },
    });

    if (!quiz || quiz.course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "Quiz not found." },
        { status: 404 }
      );
    }

    const preparedQuestions = body.questions.map((question, index) => {
      const questionText = String(question.questionText || "").trim();
      const questionType = String(question.questionType || "").toUpperCase();
      const difficulty = String(question.difficulty || "").toUpperCase();
      const timeThresholdSeconds = Number(question.timeThresholdSeconds || 0);

      if (!questionText) {
        throw new Error(`Question ${index + 1} is missing question text.`);
      }

      if (!isValidQuestionType(questionType)) {
        throw new Error(`Question ${index + 1} has invalid question type.`);
      }

      if (!isValidDifficulty(difficulty)) {
        throw new Error(`Question ${index + 1} has invalid difficulty.`);
      }

      if (!Number.isFinite(timeThresholdSeconds) || timeThresholdSeconds <= 0) {
        throw new Error(`Question ${index + 1} has invalid time threshold.`);
      }

      const optionA = question.optionA?.trim() || null;
      const optionB = question.optionB?.trim() || null;
      const optionC = question.optionC?.trim() || null;
      const optionD = question.optionD?.trim() || null;
      const correctAnswer = question.correctAnswer?.trim() || null;

      if (questionType === "MULTIPLE_CHOICE") {
        if (!optionA || !optionB || !optionC || !optionD || !correctAnswer) {
          throw new Error(
            `Question ${index + 1} is missing options or correct answer.`
          );
        }
      }

      if (
        (questionType === "IDENTIFICATION" || questionType === "COMPUTATIONAL") &&
        !correctAnswer
      ) {
        throw new Error(
          `Question ${index + 1} is missing the expected answer.`
        );
      }

      return {
        quizId,
        questionText,
        questionType,
        optionA: questionType === "MULTIPLE_CHOICE" ? optionA : null,
        optionB: questionType === "MULTIPLE_CHOICE" ? optionB : null,
        optionC: questionType === "MULTIPLE_CHOICE" ? optionC : null,
        optionD: questionType === "MULTIPLE_CHOICE" ? optionD : null,
        correctAnswer: questionType === "ESSAY" ? null : correctAnswer,
        difficulty,
        timeThresholdSeconds,
      };
    });

    await prisma.question.createMany({
      data: preparedQuestions,
    });

    return NextResponse.json({
      message: "Generated questions saved successfully.",
    });
  } catch (error) {
    console.error("Bulk create questions error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save generated questions.",
      },
      { status: 500 }
    );
  }
}