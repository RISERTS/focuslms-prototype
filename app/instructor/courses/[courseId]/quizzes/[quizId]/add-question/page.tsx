"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import InstructorShell from "@/components/instructor/InstructorShell";

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
  const isEssay = questionType === "ESSAY";
  const needsExpectedAnswer =
    questionType === "IDENTIFICATION" || questionType === "COMPUTATIONAL";

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
          correctAnswer: isEssay ? null : correctAnswer,
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
    <InstructorShell
      title="Add Question"
      description="Create a new question manually and attach it to this quiz."
      actions={[
        {
          label: "Back to Quiz",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="questionText"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Question text
              </label>
              <textarea
                id="questionText"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                rows={5}
                placeholder="Enter your question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="questionType"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Question type
                </label>
                <select
                  id="questionType"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  value={questionType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setQuestionType(nextType);

                    if (nextType === "MULTIPLE_CHOICE") {
                      setCorrectAnswer("A");
                    } else if (nextType === "ESSAY") {
                      setCorrectAnswer("");
                    } else {
                      setCorrectAnswer("");
                    }
                  }}
                >
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="IDENTIFICATION">Identification</option>
                  <option value="ESSAY">Essay</option>
                  <option value="COMPUTATIONAL">Computational</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="difficulty"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            {isMCQ ? (
              <div className="grid gap-4">
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="Option A"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="Option B"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="Option C"
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="Option D"
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                />

                <div>
                  <label
                    htmlFor="correctAnswer"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Correct answer
                  </label>
                  <select
                    id="correctAnswer"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            ) : needsExpectedAnswer ? (
              <div>
                <label
                  htmlFor="expectedAnswer"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Expected answer
                </label>
                <input
                  id="expectedAnswer"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="Enter the expected answer"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                />
              </div>
            ) : null}

            <div>
              <label
                htmlFor="timeThreshold"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Time threshold (seconds)
              </label>
              <input
                id="timeThreshold"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                type="number"
                min={10}
                max={300}
                value={timeThresholdSeconds}
                onChange={(e) => setTimeThresholdSeconds(Number(e.target.value))}
              />
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
              {loading ? "Saving..." : "Save Question"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            Question Guidelines
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Write clearly</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Keep questions concise and aligned with the target competency.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Match the type</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Multiple choice needs options. Identification and computational
                need expected answers. Essay uses manual review.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Set reasonable timing</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Time thresholds support adaptive rules and response analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}