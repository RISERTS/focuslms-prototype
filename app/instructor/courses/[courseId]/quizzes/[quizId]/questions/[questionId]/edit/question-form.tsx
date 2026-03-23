"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type QuestionType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL";

type Props = {
  courseId: string;
  quizId: string;
  questionId: string;
  initialData: {
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
};

type ApiResponse = {
  error?: string;
};

export default function EditQuestionForm({
  courseId,
  quizId,
  questionId,
  initialData,
}: Props) {
  const router = useRouter();
  const [questionText, setQuestionText] = useState(initialData.questionText);
  const [questionType, setQuestionType] = useState<QuestionType>(
    initialData.questionType
  );
  const [optionA, setOptionA] = useState(initialData.optionA ?? "");
  const [optionB, setOptionB] = useState(initialData.optionB ?? "");
  const [optionC, setOptionC] = useState(initialData.optionC ?? "");
  const [optionD, setOptionD] = useState(initialData.optionD ?? "");
  const [correctAnswer, setCorrectAnswer] = useState(
    initialData.correctAnswer ?? ""
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initialData.difficulty
  );
  const [timeThresholdSeconds, setTimeThresholdSeconds] = useState(
    initialData.timeThresholdSeconds
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionText,
          questionType,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswer: questionType === "ESSAY" ? null : correctAnswer,
          difficulty,
          timeThresholdSeconds,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to update question.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}/quizzes/${quizId}`);
      router.refresh();
    } catch (err) {
      console.error("Edit question form error:", err);
      setLoading(false);
      setError("Something went wrong while updating the question.");
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Question Text
          </label>
          <textarea
            rows={4}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Question Type
            </label>
            <select
              value={questionType}
              onChange={(e) => {
                const nextType = e.target.value as QuestionType;
                setQuestionType(nextType);

                if (nextType !== "MULTIPLE_CHOICE") {
                  setOptionA("");
                  setOptionB("");
                  setOptionC("");
                  setOptionD("");
                }

                if (nextType === "ESSAY") {
                  setCorrectAnswer("");
                }
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            >
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="IDENTIFICATION">Identification</option>
              <option value="ESSAY">Essay</option>
              <option value="COMPUTATIONAL">Computational</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Time Threshold (seconds)
            </label>
            <input
              type="number"
              min={1}
              value={timeThresholdSeconds}
              onChange={(e) => setTimeThresholdSeconds(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>
        </div>

        {questionType === "MULTIPLE_CHOICE" && (
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
              placeholder="Option A"
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
            <input
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
              placeholder="Option B"
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
            <input
              value={optionC}
              onChange={(e) => setOptionC(e.target.value)}
              placeholder="Option C"
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
            <input
              value={optionD}
              onChange={(e) => setOptionD(e.target.value)}
              placeholder="Option D"
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Correct Answer
              </label>
              <select
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              >
                <option value="">Select correct answer</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
        )}

        {(questionType === "IDENTIFICATION" || questionType === "COMPUTATIONAL") && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Expected Answer
            </label>
            <input
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>
        )}

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
          {loading ? "Saving..." : "Save Question"}
        </button>
      </form>
    </div>
  );
}