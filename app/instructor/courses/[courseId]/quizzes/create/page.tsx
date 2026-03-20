"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import InstructorShell from "@/components/instructor/InstructorShell";

type ApiErrorResponse = {
  error?: string;
  id?: string;
};

export default function CreateQuizPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState<number | "">("");
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [avoidRepeatedQuestions, setAvoidRepeatedQuestions] = useState(true);
  const [quizType, setQuizType] = useState("MULTIPLE_CHOICE");
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          title,
          description,
          maxAttempts,
          questionsPerAttempt:
            questionsPerAttempt === "" ? null : Number(questionsPerAttempt),
          shuffleOptions,
          avoidRepeatedQuestions,
          quizType,
          adaptiveMode,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiErrorResponse) : {};

      if (!res.ok || !data.id) {
        setLoading(false);
        setError(data.error || "Failed to create quiz.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}/quizzes/${data.id}`);
    } catch (err) {
      console.error("Create quiz error:", err);
      setLoading(false);
      setError("Something went wrong while creating the quiz.");
    }
  }

  return (
    <InstructorShell
      title="Create Quiz"
      description="Configure quiz settings, number of attempts, items per attempt, and adaptive behavior."
      actions={[
        {
          label: "Back to Quizzes",
          href: `/instructor/courses/${courseId}/quizzes`,
          variant: "secondary",
        },
      ]}
    >
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
                placeholder="Enter quiz title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="Describe this quiz"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  onChange={(e) => setQuizType(e.target.value)}
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  type="number"
                  min={1}
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
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                type="number"
                min={1}
                value={questionsPerAttempt}
                onChange={(e) =>
                  setQuestionsPerAttempt(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                placeholder="Leave blank to use all items"
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
              {loading ? "Creating..." : "Create Quiz"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            Quiz Setup Notes
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Items per attempt</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Controls how many questions a student answers per take.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Adaptive mode</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Uses rule-based progression based on correctness and response
                time.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Retake safety</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Repeated-question avoidance and option shuffling help reduce
                memorization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}