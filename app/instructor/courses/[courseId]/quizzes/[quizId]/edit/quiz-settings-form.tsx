"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type QuizType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL"
  | "MIXED";

type Props = {
  courseId: string;
  quizId: string;
  initialData: {
    title: string;
    description: string;
    quizType: QuizType;
    maxAttempts: number;
    questionsPerAttempt: number | null;
    shuffleOptions: boolean;
    avoidRepeatedQuestions: boolean;
    adaptiveMode: boolean;
  };
};

type ApiResponse = {
  error?: string;
};

export default function EditQuizSettingsForm({
  courseId,
  quizId,
  initialData,
}: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [quizType, setQuizType] = useState<QuizType>(initialData.quizType);
  const [maxAttempts, setMaxAttempts] = useState(initialData.maxAttempts);
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState<number | "">(
    initialData.questionsPerAttempt ?? ""
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    initialData.shuffleOptions
  );
  const [avoidRepeatedQuestions, setAvoidRepeatedQuestions] = useState(
    initialData.avoidRepeatedQuestions
  );
  const [adaptiveMode, setAdaptiveMode] = useState(initialData.adaptiveMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          quizType,
          maxAttempts,
          questionsPerAttempt:
            questionsPerAttempt === "" ? null : Number(questionsPerAttempt),
          shuffleOptions,
          avoidRepeatedQuestions,
          adaptiveMode,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to update quiz settings.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}/quizzes/${quizId}`);
      router.refresh();
    } catch (err) {
      console.error("Edit quiz settings error:", err);
      setLoading(false);
      setError("Something went wrong while updating the quiz.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Quiz title
            </label>
            <input
              id="title"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Quiz description
            </label>
            <textarea
              id="description"
              rows={5}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this quiz"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="quizType"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Quiz type
              </label>
              <select
                id="quizType"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                value={quizType}
                onChange={(e) => setQuizType(e.target.value as QuizType)}
              >
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="IDENTIFICATION">Identification</option>
                <option value="ESSAY">Essay</option>
                <option value="COMPUTATIONAL">Computational</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="maxAttempts"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Maximum attempts
              </label>
              <input
                id="maxAttempts"
                type="number"
                min={1}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="questionsPerAttempt"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Items per attempt
            </label>
            <input
              id="questionsPerAttempt"
              type="number"
              min={1}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              value={questionsPerAttempt}
              onChange={(e) =>
                setQuestionsPerAttempt(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="Leave blank to use all questions"
            />
          </div>

          <div className="grid gap-3">
            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Shuffle answer choices each attempt
              </span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={avoidRepeatedQuestions}
                onChange={(e) => setAvoidRepeatedQuestions(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Avoid repeated questions on retake
              </span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={adaptiveMode}
                onChange={(e) => setAdaptiveMode(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Enable rule-based adaptive assessment
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
          Settings Notes
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Items per attempt</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              This controls how many items the student answers in one take,
              not the total question bank size.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Adaptive mode</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Adaptive progression uses correctness and response time to choose
              the next difficulty level.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Retake controls</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Shuffle and repeat-avoidance help reduce memorization across
              multiple quiz attempts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}