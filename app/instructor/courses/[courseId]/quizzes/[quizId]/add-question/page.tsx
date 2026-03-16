"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type ApiErrorResponse = {
  error?: string;
};

export default function AddQuestionPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string; quizId: string }>();
  const courseId = params.courseId;
  const quizId = params.quizId;

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("MULTIPLE_CHOICE");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [difficulty, setDifficulty] = useState("EASY");
  const [timeThresholdSeconds, setTimeThresholdSeconds] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isMCQ = questionType === "MULTIPLE_CHOICE";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId,
          questionText,
          questionType,
          optionA: isMCQ ? optionA : null,
          optionB: isMCQ ? optionB : null,
          optionC: isMCQ ? optionC : null,
          optionD: isMCQ ? optionD : null,
          correctAnswer,
          difficulty,
          timeThresholdSeconds,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiErrorResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to add question.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}/quizzes/${quizId}`);
    } catch (err) {
      console.error("Add question error:", err);
      setLoading(false);
      setError("Something went wrong while adding the question.");
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Add Question Manually</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
        <textarea
          className="w-full rounded border p-3"
          placeholder="Question text"
          rows={4}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
        />

        <select
          className="w-full rounded border p-3"
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
        >
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="IDENTIFICATION">Identification</option>
          <option value="ESSAY">Essay</option>
          <option value="COMPUTATIONAL">Computational</option>
        </select>

        {isMCQ ? (
          <>
            <input className="w-full rounded border p-3" placeholder="Option A" value={optionA} onChange={(e) => setOptionA(e.target.value)} />
            <input className="w-full rounded border p-3" placeholder="Option B" value={optionB} onChange={(e) => setOptionB(e.target.value)} />
            <input className="w-full rounded border p-3" placeholder="Option C" value={optionC} onChange={(e) => setOptionC(e.target.value)} />
            <input className="w-full rounded border p-3" placeholder="Option D" value={optionD} onChange={(e) => setOptionD(e.target.value)} />

            <select className="w-full rounded border p-3" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
              <option value="A">Correct Answer: A</option>
              <option value="B">Correct Answer: B</option>
              <option value="C">Correct Answer: C</option>
              <option value="D">Correct Answer: D</option>
            </select>
          </>
        ) : (
          <input
            className="w-full rounded border p-3"
            placeholder="Correct answer / expected answer"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
          />
        )}

        <select className="w-full rounded border p-3" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <input
          className="w-full rounded border p-3"
          type="number"
          min={10}
          max={300}
          value={timeThresholdSeconds}
          onChange={(e) => setTimeThresholdSeconds(Number(e.target.value))}
        />

        {error && <p className="text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="rounded bg-black px-4 py-2 text-white">
          {loading ? "Saving..." : "Save Question"}
        </button>
      </form>
    </main>
  );
}