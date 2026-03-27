import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/get-session";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type QuestionType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL";

type GeneratedQuestion = {
  questionText: string;
  questionType: QuestionType;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  difficulty: Difficulty;
  timeThresholdSeconds: number;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function defaultTimeThresholdSeconds(difficulty: Difficulty) {
  if (difficulty === "EASY") return 30;
  if (difficulty === "MEDIUM") return 45;
  return 60;
}

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

function normalizeGeneratedQuestion(
  raw: unknown,
  expectedQuestionType: QuestionType
): GeneratedQuestion | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  const difficulty = String(item.difficulty || "").toUpperCase();

  if (!isValidDifficulty(difficulty)) return null;

  const questionText = String(item.questionText || "").trim();
  if (!questionText) return null;

  const questionType = String(item.questionType || "").toUpperCase();
  if (!isValidQuestionType(questionType)) return null;

  if (questionType !== expectedQuestionType) return null;

  const normalized: GeneratedQuestion = {
    questionText,
    questionType,
    optionA: item.optionA ? String(item.optionA).trim() : null,
    optionB: item.optionB ? String(item.optionB).trim() : null,
    optionC: item.optionC ? String(item.optionC).trim() : null,
    optionD: item.optionD ? String(item.optionD).trim() : null,
    correctAnswer: item.correctAnswer ? String(item.correctAnswer).trim() : null,
    difficulty,
    timeThresholdSeconds: Number(item.timeThresholdSeconds) || defaultTimeThresholdSeconds(difficulty),
  };

  if (questionType === "MULTIPLE_CHOICE") {
    if (
      !normalized.optionA ||
      !normalized.optionB ||
      !normalized.optionC ||
      !normalized.optionD ||
      !normalized.correctAnswer
    ) {
      return null;
    }
  }

  if (questionType === "ESSAY") {
    normalized.optionA = null;
    normalized.optionB = null;
    normalized.optionC = null;
    normalized.optionD = null;
    normalized.correctAnswer = null;
  }

  if (questionType === "IDENTIFICATION" || questionType === "COMPUTATIONAL") {
    normalized.optionA = null;
    normalized.optionB = null;
    normalized.optionC = null;
    normalized.optionD = null;

    if (!normalized.correctAnswer) {
      return null;
    }
  }

  if (!Number.isFinite(normalized.timeThresholdSeconds) || normalized.timeThresholdSeconds <= 0) {
    normalized.timeThresholdSeconds = defaultTimeThresholdSeconds(difficulty);
  }

  return normalized;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      topic?: string;
      questionType?: QuestionType;
      easyCount?: number;
      mediumCount?: number;
      hardCount?: number;
    };

    const topic = String(body.topic || "").trim();
    const questionType = String(body.questionType || "").toUpperCase();

    const easyCount = Number(body.easyCount ?? 0);
    const mediumCount = Number(body.mediumCount ?? 0);
    const hardCount = Number(body.hardCount ?? 0);

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required." },
        { status: 400 }
      );
    }

    if (!isValidQuestionType(questionType)) {
      return NextResponse.json(
        { error: "Invalid question type." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(easyCount) ||
      !Number.isInteger(mediumCount) ||
      !Number.isInteger(hardCount) ||
      easyCount < 0 ||
      mediumCount < 0 ||
      hardCount < 0
    ) {
      return NextResponse.json(
        { error: "Difficulty counts must be whole numbers starting from 0." },
        { status: 400 }
      );
    }

    const totalRequested = easyCount + mediumCount + hardCount;

    if (totalRequested <= 0) {
      return NextResponse.json(
        { error: "At least one question must be requested." },
        { status: 400 }
      );
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: `
You are a quiz generator.

STRICT RULES:
- Return ONLY valid JSON
- Return ONLY a JSON array
- No markdown
- No explanations
- No extra text before or after the JSON
- Follow the exact difficulty counts requested
- difficulty must be exactly one of: EASY, MEDIUM, HARD
- questionType must exactly match the requested question type
          `,
        },
        {
          role: "user",
          content: `
Generate ${totalRequested} quiz questions about:
"${topic}"

Question type:
${questionType}

Difficulty counts:
- EASY: ${easyCount}
- MEDIUM: ${mediumCount}
- HARD: ${hardCount}

Return this exact JSON shape:

[
  {
    "questionText": "string",
    "questionType": "${questionType}",
    "optionA": "string or null",
    "optionB": "string or null",
    "optionC": "string or null",
    "optionD": "string or null",
    "correctAnswer": "string or null",
    "difficulty": "EASY | MEDIUM | HARD",
    "timeThresholdSeconds": number
  }
]

Rules:
- Total questions must equal ${totalRequested}
- EXACTLY ${easyCount} questions must be EASY
- EXACTLY ${mediumCount} questions must be MEDIUM
- EXACTLY ${hardCount} questions must be HARD

Extra rules by type:
- MULTIPLE_CHOICE:
  - provide optionA, optionB, optionC, optionD
  - correctAnswer must be one of A, B, C, D
- IDENTIFICATION:
  - options must be null
  - correctAnswer must be a short direct answer
- ESSAY:
  - options must be null
  - correctAnswer must be null
- COMPUTATIONAL:
  - options must be null
  - correctAnswer must be the final answer only

Time threshold guide:
- EASY around 30 seconds
- MEDIUM around 45 seconds
- HARD around 60 seconds
          `,
        },
      ],
    });

    const rawText = response.output_text?.trim();

    if (!rawText) {
      return NextResponse.json(
        { error: "AI returned an empty response." },
        { status: 500 }
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch (parseError) {
      console.error("AI returned invalid JSON:", rawText);
      console.error("JSON parse error:", parseError);

      return NextResponse.json(
        { error: "AI returned invalid JSON." },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "AI response format is invalid." },
        { status: 500 }
      );
    }

    const normalizedQuestions = parsed
      .map((item) => normalizeGeneratedQuestion(item, questionType))
      .filter((item): item is GeneratedQuestion => item !== null);

    if (normalizedQuestions.length !== totalRequested) {
      return NextResponse.json(
        { error: "AI did not return the requested total number of valid questions." },
        { status: 500 }
      );
    }

    const counts = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
    };

    for (const question of normalizedQuestions) {
      counts[question.difficulty]++;
    }

    if (
      counts.EASY !== easyCount ||
      counts.MEDIUM !== mediumCount ||
      counts.HARD !== hardCount
    ) {
      return NextResponse.json(
        { error: "AI did not follow the requested difficulty distribution." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      questions: normalizedQuestions,
    });
  } catch (error) {
    console.error("Generate quiz questions error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz questions." },
      { status: 500 }
    );
  }
}