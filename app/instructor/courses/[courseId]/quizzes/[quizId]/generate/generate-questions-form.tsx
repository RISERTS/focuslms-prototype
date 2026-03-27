"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

type GenerateResponse = {
  error?: string;
  questions?: GeneratedQuestion[];
};

type SaveResponse = {
  error?: string;
  message?: string;
};

export default function GenerateQuestionsForm({
  courseId,
  quizId,
  quizTitle,
}: {
  courseId: string;
  quizId: string;
  quizTitle: string;
}) {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [questionType, setQuestionType] =
    useState<QuestionType>("MULTIPLE_CHOICE");

  const [easyCount, setEasyCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);

  const [generatedQuestions, setGeneratedQuestions] = useState<
    GeneratedQuestion[]
  >([]);

  const [generateLoading, setGenerateLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const totalCount = useMemo(
    () => easyCount + mediumCount + hardCount,
    [easyCount, mediumCount, hardCount]
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerateLoading(true);
    setError("");
    setMessage("");
    setGeneratedQuestions([]);

    if (!topic.trim()) {
      setGenerateLoading(false);
      setError("Topic is required.");
      return;
    }

    if (totalCount <= 0) {
      setGenerateLoading(false);
      setError("Enter at least one question count.");
      return;
    }

    try {
      const res = await fetch("/api/quiz-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          questionType,
          easyCount,
          mediumCount,
          hardCount,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as GenerateResponse) : {};

      if (!res.ok) {
        setGenerateLoading(false);
        setError(data.error || "Failed to generate questions.");
        return;
      }

      setGenerateLoading(false);
      setGeneratedQuestions(data.questions || []);
      setMessage("Questions generated successfully.");
    } catch (err) {
      console.error("Generate questions UI error:", err);
      setGenerateLoading(false);
      setError("Something went wrong while generating questions.");
    }
  }

  async function handleSaveQuestions() {
    setSaveLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(
        `/api/quizzes/${quizId}/bulk-create-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questions: generatedQuestions,
          }),
        }
      );

      const text = await res.text();
      const data = text ? (JSON.parse(text) as SaveResponse) : {};

      if (!res.ok) {
        setSaveLoading(false);
        setError(data.error || "Failed to save generated questions.");
        return;
      }

      setSaveLoading(false);
      setMessage(data.message || "Questions saved successfully.");
      router.push(`/instructor/courses/${courseId}/quizzes/${quizId}`);
      router.refresh();
    } catch (err) {
      console.error("Save generated questions UI error:", err);
      setSaveLoading(false);
      setError("Something went wrong while saving the questions.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Quiz
            </label>
            <input
              value={quizTitle}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Topic / Coverage
            </label>
            <textarea
              rows={4}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              placeholder="Example: Introduction to database normalization and functional dependencies"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Question Type
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            >
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="IDENTIFICATION">Identification</option>
              <option value="ESSAY">Essay</option>
              <option value="COMPUTATIONAL">Computational</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Easy
              </label>
              <input
                type="number"
                min={0}
                value={easyCount}
                onChange={(e) => setEasyCount(Number(e.target.value))}
                className="w-full rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Medium
              </label>
              <input
                type="number"
                min={0}
                value={mediumCount}
                onChange={(e) => setMediumCount(Number(e.target.value))}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Hard
              </label>
              <input
                type="number"
                min={0}
                value={hardCount}
                onChange={(e) => setHardCount(Number(e.target.value))}
                className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              Total Questions:{" "}
              <span className="font-semibold text-gray-900">{totalCount}</span>
            </p>
          </div>

          {message && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={generateLoading || totalCount <= 0}
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
            >
              {generateLoading ? "Generating..." : "Generate Questions"}
            </button>

            {generatedQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => void handleSaveQuestions()}
                disabled={saveLoading}
                className="rounded-xl border border-violet-300 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-70"
              >
                {saveLoading ? "Saving..." : "Save All Questions"}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
          Generation Rules
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Exact Difficulty Counts</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              The AI is instructed to return the exact number of easy, medium,
              and hard questions that you enter.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Mixed Difficulties</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              You can generate multiple difficulty levels in one batch, such as
              8 easy, 12 medium, and 9 hard questions at the same time.
            </p>
          </div>
        </div>
      </div>

      {generatedQuestions.length > 0 && (
        <div className="lg:col-span-2 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Generated Questions</h2>

          <div className="mt-6 space-y-4">
            {generatedQuestions.map((question, index) => (
              <div
                key={`${question.questionText}-${index}`}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {index + 1}. {question.questionText}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-black px-3 py-1 font-semibold text-white">
                        {question.questionType}
                      </span>
                      <span className="rounded-full border border-gray-300 px-3 py-1">
                        {question.difficulty}
                      </span>
                      <span className="rounded-full border border-gray-300 px-3 py-1">
                        {question.timeThresholdSeconds}s
                      </span>
                    </div>
                  </div>
                </div>

                {question.questionType === "MULTIPLE_CHOICE" ? (
                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <p>A. {question.optionA}</p>
                    <p>B. {question.optionB}</p>
                    <p>C. {question.optionC}</p>
                    <p>D. {question.optionD}</p>
                    <p className="mt-2 font-medium text-gray-900">
                      Correct Answer: {question.correctAnswer}
                    </p>
                  </div>
                ) : question.questionType === "ESSAY" ? (
                  <p className="mt-4 text-sm text-gray-700">
                    <span className="font-medium text-gray-900">
                      Manual review required
                    </span>
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-gray-700">
                    Expected Answer:{" "}
                    <span className="font-medium text-gray-900">
                      {question.correctAnswer}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}