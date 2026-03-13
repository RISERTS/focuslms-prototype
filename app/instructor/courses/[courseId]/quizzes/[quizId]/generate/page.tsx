"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

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

  function updateQuestion(index: number, key: keyof DraftQuestion, value: string | number | boolean) {
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
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Generate Questions with AI</h1>

      <form onSubmit={handleGenerate} className="mt-6 max-w-xl space-y-4">
        <input
          className="w-full rounded border p-3"
          placeholder="Course title"
          value={courseTitle}
          onChange={(e) => setCourseTitle(e.target.value)}
        />

        <input
          className="w-full rounded border p-3"
          placeholder="Lesson title"
          value={lessonTitle}
          onChange={(e) => setLessonTitle(e.target.value)}
        />

        <input
          className="w-full rounded border p-3"
          type="number"
          min={1}
          max={20}
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
        />

        {error && <p className="text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="rounded bg-black px-4 py-2 text-white">
          {loading ? "Generating..." : "Generate Questions"}
        </button>
      </form>

      {questions.length > 0 && (
        <div className="mt-10 space-y-6">
          <h2 className="text-2xl font-semibold">Review and Edit Draft Questions</h2>

          {questions.map((q, index) => (
            <div key={index} className="rounded border p-4">
              <label className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={q.selected}
                  onChange={(e) => updateQuestion(index, "selected", e.target.checked)}
                />
                Include this question
              </label>

              <textarea
                className="w-full rounded border p-3"
                rows={3}
                value={q.questionText}
                onChange={(e) => updateQuestion(index, "questionText", e.target.value)}
              />

              <div className="mt-3 space-y-2">
                <input className="w-full rounded border p-3" value={q.optionA} onChange={(e) => updateQuestion(index, "optionA", e.target.value)} />
                <input className="w-full rounded border p-3" value={q.optionB} onChange={(e) => updateQuestion(index, "optionB", e.target.value)} />
                <input className="w-full rounded border p-3" value={q.optionC} onChange={(e) => updateQuestion(index, "optionC", e.target.value)} />
                <input className="w-full rounded border p-3" value={q.optionD} onChange={(e) => updateQuestion(index, "optionD", e.target.value)} />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <select
                  className="rounded border p-3"
                  value={q.correctAnswer}
                  onChange={(e) => updateQuestion(index, "correctAnswer", e.target.value as CorrectAnswer)}
                >
                  <option value="A">Correct: A</option>
                  <option value="B">Correct: B</option>
                  <option value="C">Correct: C</option>
                  <option value="D">Correct: D</option>
                </select>

                <select
                  className="rounded border p-3"
                  value={q.difficulty}
                  onChange={(e) => updateQuestion(index, "difficulty", e.target.value as Difficulty)}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>

                <input
                  className="rounded border p-3"
                  type="number"
                  min={10}
                  max={120}
                  value={q.timeThresholdSeconds}
                  onChange={(e) => updateQuestion(index, "timeThresholdSeconds", Number(e.target.value))}
                />
              </div>

              <p className="mt-3 text-sm text-gray-500">Rationale: {q.rationale}</p>
            </div>
          ))}

          <button
            onClick={handleSaveSelected}
            disabled={saving}
            className="rounded bg-black px-4 py-2 text-white"
          >
            {saving ? "Saving..." : "Save Selected Questions"}
          </button>
        </div>
      )}
    </main>
  );
}
