"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import InstructorShell from "@/components/instructor/InstructorShell";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type CorrectAnswer = "A" | "B" | "C" | "D";

type DraftQuestion = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: CorrectAnswer;
  difficulty: Difficulty;
  timeThresholdSeconds: number;
  rationale: string;
  selected: boolean;
};

type GenerateResponse = {
  questions?: Omit<DraftQuestion, "selected">[];
  error?: string;
};

export default function GenerateQuestionsPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string; quizId: string }>();
  const courseId = params.courseId;
  const quizId = params.quizId;

  const [courseTitle, setCourseTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/quiz-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseTitle,
          lessonTitle,
          questionCount,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as GenerateResponse) : {};

      if (!res.ok || !data.questions) {
        setLoading(false);
        setError(data.error || "Failed to generate questions.");
        return;
      }

      setQuestions(
        data.questions.map((q) => ({
          ...q,
          selected: true,
        }))
      );
      setLoading(false);
    } catch (err) {
      console.error("Generate questions error:", err);
      setLoading(false);
      setError("Something went wrong while generating questions.");
    }
  }

  function updateQuestion(
    index: number,
    key: keyof DraftQuestion,
    value: string | number | boolean
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [key]: value } : q))
    );
  }

  async function handleSaveSelected() {
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/questions/save-generated", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId,
          questions,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as { error?: string }) : {};

      if (!res.ok) {
        setSaving(false);
        setError(data.error || "Failed to save selected questions.");
        return;
      }

      setSaving(false);
      router.push(`/instructor/courses/${courseId}/quizzes/${quizId}`);
    } catch (err) {
      console.error("Save selected questions error:", err);
      setSaving(false);
      setError("Something went wrong while saving selected questions.");
    }
  }

  return (
    <InstructorShell
      title="Generate Questions with AI"
      description="Draft quiz questions faster, then review, edit, select, and save them into your question bank."
      actions={[
        {
          label: "Back to Quiz",
          href: `/instructor/courses/${courseId}/quizzes/${quizId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label
                htmlFor="courseTitle"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Course title
              </label>
              <input
                id="courseTitle"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="Enter course title"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="lessonTitle"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Lesson title
              </label>
              <input
                id="lessonTitle"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="Enter lesson title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="questionCount"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Number of questions
              </label>
              <input
                id="questionCount"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
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
              {loading ? "Generating..." : "Generate Questions"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Draft Questions</h2>

            {questions.length > 0 && (
              <button
                onClick={handleSaveSelected}
                disabled={saving}
                className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save Selected"}
              </button>
            )}
          </div>

          <div className="mt-6 space-y-5">
            {questions.length === 0 ? (
              <p className="text-sm text-gray-600">
                Generated questions will appear here for review and editing.
              </p>
            ) : (
              questions.map((q, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                >
                  <label className="mb-4 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={q.selected}
                      onChange={(e) =>
                        updateQuestion(index, "selected", e.target.checked)
                      }
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Include this question
                    </span>
                  </label>

                  <textarea
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                    rows={3}
                    value={q.questionText}
                    onChange={(e) =>
                      updateQuestion(index, "questionText", e.target.value)
                    }
                  />

                  <div className="mt-4 grid gap-3">
                    <input
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      value={q.optionA}
                      onChange={(e) =>
                        updateQuestion(index, "optionA", e.target.value)
                      }
                    />
                    <input
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      value={q.optionB}
                      onChange={(e) =>
                        updateQuestion(index, "optionB", e.target.value)
                      }
                    />
                    <input
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      value={q.optionC}
                      onChange={(e) =>
                        updateQuestion(index, "optionC", e.target.value)
                      }
                    />
                    <input
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      value={q.optionD}
                      onChange={(e) =>
                        updateQuestion(index, "optionD", e.target.value)
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <select
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      value={q.correctAnswer}
                      onChange={(e) =>
                        updateQuestion(
                          index,
                          "correctAnswer",
                          e.target.value as CorrectAnswer
                        )
                      }
                    >
                      <option value="A">Correct: A</option>
                      <option value="B">Correct: B</option>
                      <option value="C">Correct: C</option>
                      <option value="D">Correct: D</option>
                    </select>

                    <select
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      value={q.difficulty}
                      onChange={(e) =>
                        updateQuestion(
                          index,
                          "difficulty",
                          e.target.value as Difficulty
                        )
                      }
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>

                    <input
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      type="number"
                      min={10}
                      max={120}
                      value={q.timeThresholdSeconds}
                      onChange={(e) =>
                        updateQuestion(
                          index,
                          "timeThresholdSeconds",
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-4 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">Rationale</p>
                    <p className="mt-2 leading-6">{q.rationale}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}