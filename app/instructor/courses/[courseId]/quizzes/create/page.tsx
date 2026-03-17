"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

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
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Create Quiz</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        <input
          className="w-full rounded border p-3"
          placeholder="Quiz title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full rounded border p-3"
          placeholder="Quiz description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="w-full rounded border p-3"
          value={quizType}
          onChange={(e) => setQuizType(e.target.value)}
        >
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="IDENTIFICATION">Identification</option>
          <option value="ESSAY">Essay</option>
          <option value="COMPUTATIONAL">Computational</option>
          <option value="MIXED">Mixed</option>
        </select>

        <input
          className="w-full rounded border p-3"
          type="number"
          min={1}
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(Number(e.target.value))}
          placeholder="Maximum attempts"
        />

        <input
          className="w-full rounded border p-3"
          type="number"
          min={1}
          value={questionsPerAttempt}
          onChange={(e) =>
            setQuestionsPerAttempt(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          placeholder="Items per attempt"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shuffleOptions}
            onChange={(e) => setShuffleOptions(e.target.checked)}
          />
          Shuffle answer choices each attempt
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={avoidRepeatedQuestions}
            onChange={(e) => setAvoidRepeatedQuestions(e.target.checked)}
          />
          Avoid repeated questions on retake
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={adaptiveMode}
            onChange={(e) => setAdaptiveMode(e.target.checked)}
          />
          Enable rule-based adaptive assessment
        </label>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white"
        >
          {loading ? "Creating..." : "Create Quiz"}
        </button>
      </form>
    </main>
  );
}