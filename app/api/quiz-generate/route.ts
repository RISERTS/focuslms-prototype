import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/get-session";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type CorrectAnswer = "A" | "B" | "C" | "D";

type GeneratedQuestion = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: CorrectAnswer;
  difficulty: Difficulty;
  timeThresholdSeconds: number;
  rationale: string;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Only instructors can generate quiz questions." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      courseTitle?: string;
      lessonTitle?: string;
      questionCount?: number;
    };

    const { courseTitle, lessonTitle, questionCount } = body;

    if (!courseTitle?.trim() || !lessonTitle?.trim() || !questionCount) {
      return NextResponse.json(
        { error: "Course title, lesson title, and question count are required." },
        { status: 400 }
      );
    }

    const count = Number(questionCount);
    if (count < 1 || count > 20) {
      return NextResponse.json(
        { error: "Question count must be between 1 and 20." },
        { status: 400 }
      );
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You generate multiple-choice quiz questions for a web-based LMS. " +
                "Return only valid JSON matching the schema. " +
                "Generate balanced and classroom-appropriate questions. " +
                "Avoid trick wording, all-of-the-above, none-of-the-above, and duplicate questions. " +
                "Use exactly four options per question and exactly one correct answer. " +
                "Assign a reasonable time threshold in seconds.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `Course title: ${courseTitle}\n` +
                `Lesson title: ${lessonTitle}\n` +
                `Number of questions: ${count}\n\n` +
                "Generate draft quiz questions for instructor review.",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "generated_quiz_questions",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              questions: {
                type: "array",
                minItems: count,
                maxItems: count,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    questionText: { type: "string" },
                    optionA: { type: "string" },
                    optionB: { type: "string" },
                    optionC: { type: "string" },
                    optionD: { type: "string" },
                    correctAnswer: {
                      type: "string",
                      enum: ["A", "B", "C", "D"],
                    },
                    difficulty: {
                      type: "string",
                      enum: ["EASY", "MEDIUM", "HARD"],
                    },
                    timeThresholdSeconds: { type: "integer" },
                    rationale: { type: "string" },
                  },
                  required: [
                    "questionText",
                    "optionA",
                    "optionB",
                    "optionC",
                    "optionD",
                    "correctAnswer",
                    "difficulty",
                    "timeThresholdSeconds",
                    "rationale",
                  ],
                },
              },
            },
            required: ["questions"],
          },
        },
      },
    });

    const raw = response.output_text;
    const parsed = JSON.parse(raw) as { questions: GeneratedQuestion[] };

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Generate quiz questions error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz questions." },
      { status: 500 }
    );
  }
}
