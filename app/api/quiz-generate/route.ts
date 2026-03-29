import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type QuestionType = "MULTIPLE_CHOICE" | "IDENTIFICATION" | "COMPUTATIONAL";

type DifficultyCounts = {
  easy?: number;
  medium?: number;
  hard?: number;
};

type RequestBody = {
  quizId?: string;
  topic?: string;
  sourceText?: string;
  additionalInstructions?: string;
  multipleChoice?: DifficultyCounts;
  identification?: DifficultyCounts;
  computational?: DifficultyCounts;
};

type GeneratedQuestion = {
  questionType: QuestionType;
  difficulty: Difficulty;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  correctAnswer: string;
  timeThresholdSeconds?: number | null;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function toCount(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.floor(num));
}

function normalizeCounts(input?: DifficultyCounts) {
  return {
    EASY: toCount(input?.easy),
    MEDIUM: toCount(input?.medium),
    HARD: toCount(input?.hard),
  };
}

function getTotalCount(counts: Record<Difficulty, number>) {
  return counts.EASY + counts.MEDIUM + counts.HARD;
}

function difficultyToTimeThreshold(difficulty: Difficulty) {
  if (difficulty === "EASY") return 30;
  if (difficulty === "MEDIUM") return 45;
  return 60;
}

function extractJson(text: string) {
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const startCandidates = [firstBrace, firstBracket].filter((i) => i >= 0);
  if (startCandidates.length === 0) {
    throw new Error("No JSON found in model output.");
  }

  const start = Math.min(...startCandidates);
  const lastBrace = text.lastIndexOf("}");
  const lastBracket = text.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);

  if (end < start) {
    throw new Error("Invalid JSON boundaries in model output.");
  }

  return text.slice(start, end + 1);
}

function normalizeQuestionType(value: string): QuestionType | null {
  const upper = value.trim().toUpperCase();
  if (
    upper === "MULTIPLE_CHOICE" ||
    upper === "IDENTIFICATION" ||
    upper === "COMPUTATIONAL"
  ) {
    return upper;
  }
  return null;
}

function normalizeDifficulty(value: string): Difficulty | null {
  const upper = value.trim().toUpperCase();
  if (upper === "EASY" || upper === "MEDIUM" || upper === "HARD") {
    return upper;
  }
  return null;
}

function validateGeneratedQuestion(raw: GeneratedQuestion): GeneratedQuestion | null {
  const questionType = normalizeQuestionType(raw.questionType);
  const difficulty = normalizeDifficulty(raw.difficulty);

  if (!questionType || !difficulty) return null;

  const questionText = String(raw.questionText || "").trim();
  const correctAnswer = String(raw.correctAnswer || "").trim();

  if (!questionText || !correctAnswer) return null;

  if (questionType === "MULTIPLE_CHOICE") {
    const optionA = String(raw.optionA || "").trim();
    const optionB = String(raw.optionB || "").trim();
    const optionC = String(raw.optionC || "").trim();
    const optionD = String(raw.optionD || "").trim();
    const answerKey = correctAnswer.toUpperCase();

    if (!optionA || !optionB || !optionC || !optionD) return null;
    if (!["A", "B", "C", "D"].includes(answerKey)) return null;

    return {
      questionType,
      difficulty,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer: answerKey,
      timeThresholdSeconds:
        raw.timeThresholdSeconds && raw.timeThresholdSeconds > 0
          ? Math.floor(raw.timeThresholdSeconds)
          : difficultyToTimeThreshold(difficulty),
    };
  }

  return {
    questionType,
    difficulty,
    questionText,
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    correctAnswer,
    timeThresholdSeconds:
      raw.timeThresholdSeconds && raw.timeThresholdSeconds > 0
        ? Math.floor(raw.timeThresholdSeconds)
        : difficultyToTimeThreshold(difficulty),
  };
}

function buildRequestedMatrix(body: RequestBody) {
  return {
    MULTIPLE_CHOICE: normalizeCounts(body.multipleChoice),
    IDENTIFICATION: normalizeCounts(body.identification),
    COMPUTATIONAL: normalizeCounts(body.computational),
  } as const;
}

function countNeeded(
  matrix: ReturnType<typeof buildRequestedMatrix>,
  type: QuestionType,
  difficulty: Difficulty
) {
  return matrix[type][difficulty];
}

function takeOnlyNeededQuestions(
  generated: GeneratedQuestion[],
  requested: ReturnType<typeof buildRequestedMatrix>
) {
  const accepted: GeneratedQuestion[] = [];

  const remaining = {
    MULTIPLE_CHOICE: { ...requested.MULTIPLE_CHOICE },
    IDENTIFICATION: { ...requested.IDENTIFICATION },
    COMPUTATIONAL: { ...requested.COMPUTATIONAL },
  };

  for (const question of generated) {
    const left = remaining[question.questionType][question.difficulty];
    if (left > 0) {
      accepted.push(question);
      remaining[question.questionType][question.difficulty] -= 1;
    }
  }

  return { accepted, remaining };
}

function hasUnfilledCounts(
  remaining: ReturnType<typeof takeOnlyNeededQuestions>["remaining"]
) {
  return Object.values(remaining).some((difficultyGroup) =>
    Object.values(difficultyGroup).some((count) => count > 0)
  );
}

function buildGenerationPrompt(args: {
  topic: string;
  sourceText: string;
  additionalInstructions: string;
  requested: ReturnType<typeof buildRequestedMatrix>;
}) {
  const { topic, sourceText, additionalInstructions, requested } = args;

  return `
Generate quiz questions in JSON only.

Allowed question types:
- MULTIPLE_CHOICE
- IDENTIFICATION
- COMPUTATIONAL

DO NOT generate ESSAY questions.

Required counts:
- MULTIPLE_CHOICE:
  - EASY: ${requested.MULTIPLE_CHOICE.EASY}
  - MEDIUM: ${requested.MULTIPLE_CHOICE.MEDIUM}
  - HARD: ${requested.MULTIPLE_CHOICE.HARD}
- IDENTIFICATION:
  - EASY: ${requested.IDENTIFICATION.EASY}
  - MEDIUM: ${requested.IDENTIFICATION.MEDIUM}
  - HARD: ${requested.IDENTIFICATION.HARD}
- COMPUTATIONAL:
  - EASY: ${requested.COMPUTATIONAL.EASY}
  - MEDIUM: ${requested.COMPUTATIONAL.MEDIUM}
  - HARD: ${requested.COMPUTATIONAL.HARD}

Rules:
1. Return ONLY valid JSON.
2. JSON shape must be:
{
  "questions": [
    {
      "questionType": "MULTIPLE_CHOICE" | "IDENTIFICATION" | "COMPUTATIONAL",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "questionText": "string",
      "optionA": "string or null",
      "optionB": "string or null",
      "optionC": "string or null",
      "optionD": "string or null",
      "correctAnswer": "string",
      "timeThresholdSeconds": number
    }
  ]
}
3. For MULTIPLE_CHOICE:
   - provide optionA, optionB, optionC, optionD
   - correctAnswer must be exactly one of: A, B, C, D
4. For IDENTIFICATION and COMPUTATIONAL:
   - optionA-D must be null
   - correctAnswer must contain the actual answer text
5. Make the difficulty genuinely match EASY, MEDIUM, or HARD.
6. Do not include explanations outside the JSON.
7. Generate exactly the requested totals.

Topic:
${topic || "General course topic"}

Source / coverage notes:
${sourceText || "Use standard academic coverage related to the topic."}

Additional instructions:
${additionalInstructions || "Keep the questions classroom-appropriate and clear."}
`.trim();
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Only instructors can generate quiz questions." },
        { status: 403 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing from the environment." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as RequestBody;

    const quizId = String(body.quizId || "").trim();
    const topic = String(body.topic || "").trim();
    const sourceText = String(body.sourceText || "").trim();
    const additionalInstructions = String(
      body.additionalInstructions || ""
    ).trim();

    if (!quizId) {
      return NextResponse.json({ error: "Quiz is required." }, { status: 400 });
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

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    if (quiz.course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only generate questions for your own quiz." },
        { status: 403 }
      );
    }

    const requested = buildRequestedMatrix(body);

    const totalRequested =
      getTotalCount(requested.MULTIPLE_CHOICE) +
      getTotalCount(requested.IDENTIFICATION) +
      getTotalCount(requested.COMPUTATIONAL);

    if (totalRequested <= 0) {
      return NextResponse.json(
        { error: "Please request at least one question." },
        { status: 400 }
      );
    }

    const prompt = buildGenerationPrompt({
      topic,
      sourceText,
      additionalInstructions,
      requested,
    });

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: "You generate classroom quiz questions and return strict JSON only.",
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    });

    const rawText =
      typeof response.output_text === "string" ? response.output_text : "";

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "The model returned an empty response." },
        { status: 500 }
      );
    }

    let parsed: { questions?: GeneratedQuestion[] };

    try {
      parsed = JSON.parse(extractJson(rawText)) as { questions?: GeneratedQuestion[] };
    } catch (error) {
      console.error("Quiz generate parse error:", rawText);
      return NextResponse.json(
        { error: "The generated output was not valid JSON." },
        { status: 500 }
      );
    }

    const validated = Array.isArray(parsed.questions)
      ? parsed.questions
          .map(validateGeneratedQuestion)
          .filter((question): question is GeneratedQuestion => question !== null)
      : [];

    const { accepted, remaining } = takeOnlyNeededQuestions(validated, requested);

    if (hasUnfilledCounts(remaining)) {
      return NextResponse.json(
        {
          error:
            "The AI response did not satisfy all requested type/difficulty counts. Please try again.",
          debug: {
            requested,
            remaining,
          },
        },
        { status: 500 }
      );
    }

    const created = await prisma.$transaction(
      accepted.map((question) =>
        prisma.question.create({
          data: {
            quizId,
            questionText: question.questionText,
            questionType: question.questionType,
            optionA: question.optionA ?? null,
            optionB: question.optionB ?? null,
            optionC: question.optionC ?? null,
            optionD: question.optionD ?? null,
            correctAnswer: question.correctAnswer,
            difficulty: question.difficulty,
            timeThresholdSeconds:
              question.timeThresholdSeconds ??
              difficultyToTimeThreshold(question.difficulty),
          },
        })
      )
    );

    return NextResponse.json({
      message: `${created.length} question(s) generated successfully.`,
      createdCount: created.length,
      breakdown: {
        multipleChoice: {
          easy: countNeeded(requested, "MULTIPLE_CHOICE", "EASY"),
          medium: countNeeded(requested, "MULTIPLE_CHOICE", "MEDIUM"),
          hard: countNeeded(requested, "MULTIPLE_CHOICE", "HARD"),
        },
        identification: {
          easy: countNeeded(requested, "IDENTIFICATION", "EASY"),
          medium: countNeeded(requested, "IDENTIFICATION", "MEDIUM"),
          hard: countNeeded(requested, "IDENTIFICATION", "HARD"),
        },
        computational: {
          easy: countNeeded(requested, "COMPUTATIONAL", "EASY"),
          medium: countNeeded(requested, "COMPUTATIONAL", "MEDIUM"),
          hard: countNeeded(requested, "COMPUTATIONAL", "HARD"),
        },
      },
    });
  } catch (error) {
    console.error("Generate quiz questions error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions." },
      { status: 500 }
    );
  }
}