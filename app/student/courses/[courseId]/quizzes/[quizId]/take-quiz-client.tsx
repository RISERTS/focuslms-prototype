"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type QuizQuestion = {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

type QuizData = {
  id: string;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
};

type Props = {
  quiz: QuizData;
};

export default function TakeQuizClient({ quiz }: Props) {
  const router = useRouter();
  const startTimeRef = useRef<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  function choose(questionId: string, value: "A" | "B" | "C" | "D") {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    setError("");

    if (Object.keys(answers).length !== quiz.questions.length) {
      setError("Please answer all questions.");
      return;
    }

    setLoading(true);

    const startedAt = startTimeRef.current ?? Date.now();
    const elapsedSeconds = Math.max(
      1,
      Math.floor((Date.now() - startedAt) / 1000)
    );
    const avgPerQuestion = Math.max(
      1,
      Math.floor(elapsedSeconds / quiz.questions.length)
    );

    const payload = {
      quizId: quiz.id,
      answers: quiz.questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: answers[q.id],
        responseTimeSeconds: avgPerQuestion,
      })),
    };

    try {
      const res = await fetch("/api/quiz-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const data = text
        ? (JSON.parse(text) as { error?: string; score?: number })
        : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to submit quiz.");
        return;
      }

      setLoading(false);
      alert(`Quiz submitted. Score: ${data.score}`);
      router.refresh();
    } catch (err) {
      console.error("Submit quiz error:", err);
      setLoading(false);
      setError("Something went wrong while submitting the quiz.");
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">{quiz.title}</h1>
      <p className="mt-2 text-gray-600">{quiz.description || "No description"}</p>

      <div className="mt-8 space-y-6">
        {quiz.questions.map((q, index) => (
          <div key={q.id} className="rounded border p-4">
            <p className="font-semibold">
              {index + 1}. {q.questionText}
            </p>

            <div className="mt-3 space-y-2">
              {(["A", "B", "C", "D"] as const).map((choice) => {
                const text =
                  choice === "A"
                    ? q.optionA
                    : choice === "B"
                    ? q.optionB
                    : choice === "C"
                    ? q.optionC
                    : q.optionD;

                return (
                  <label key={choice} className="block">
                    <input
                      type="radio"
                      name={q.id}
                      value={choice}
                      checked={answers[q.id] === choice}
                      onChange={() => choose(q.id, choice)}
                      className="mr-2"
                    />
                    {choice}. {text}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-6 rounded bg-black px-4 py-2 text-white"
      >
        {loading ? "Submitting..." : "Submit Quiz"}
      </button>
    </main>
  );
}
