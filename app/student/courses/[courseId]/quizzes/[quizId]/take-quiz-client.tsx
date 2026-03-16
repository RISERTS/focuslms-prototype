"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type OriginalOptionKey = "A" | "B" | "C" | "D";

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
  shuffleOptions: boolean;
  questions: QuizQuestion[];
};

type Props = {
  quiz: QuizData;
};

type ShuffledChoice = {
  originalKey: OriginalOptionKey;
  text: string;
};

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

export default function TakeQuizClient({ quiz }: Props) {
  const router = useRouter();
  const startTimeRef = useRef<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, OriginalOptionKey>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const renderedQuestions = useMemo(() => {
    return quiz.questions.map((q) => {
      const choices: ShuffledChoice[] = [
        { originalKey: "A", text: q.optionA },
        { originalKey: "B", text: q.optionB },
        { originalKey: "C", text: q.optionC },
        { originalKey: "D", text: q.optionD },
      ];

      return {
        ...q,
        renderedChoices: quiz.shuffleOptions ? shuffleArray(choices) : choices,
      };
    });
  }, [quiz]);

  function choose(questionId: string, value: OriginalOptionKey) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    setError("");

    if (Object.keys(answers).length !== renderedQuestions.length) {
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
      Math.floor(elapsedSeconds / renderedQuestions.length)
    );

    const payload = {
      quizId: quiz.id,
      answers: renderedQuestions.map((q) => ({
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
        {renderedQuestions.map((q, index) => (
          <div key={q.id} className="rounded border p-4">
            <p className="font-semibold">
              {index + 1}. {q.questionText}
            </p>

            <div className="mt-3 space-y-2">
              {q.renderedChoices.map((choice, choiceIndex) => {
                const visualLabel = ["A", "B", "C", "D"][choiceIndex];

                return (
                  <label key={`${q.id}-${choice.originalKey}`} className="block">
                    <input
                      type="radio"
                      name={q.id}
                      value={choice.originalKey}
                      checked={answers[q.id] === choice.originalKey}
                      onChange={() => choose(q.id, choice.originalKey)}
                      className="mr-2"
                    />
                    {visualLabel}. {choice.text}
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