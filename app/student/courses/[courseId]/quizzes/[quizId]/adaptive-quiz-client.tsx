"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type OriginalOptionKey = "A" | "B" | "C" | "D";
type QuestionType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

type AdaptiveQuestion = {
  id: string;
  questionText: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  timeThresholdSeconds: number;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
};

type QuizMeta = {
  id: string;
  title: string;
  description: string | null;
  shuffleOptions: boolean;
  maxItems: number;
};

type SavedAdaptiveAnswer = {
  questionId: string;
  selectedAnswer: string;
  responseTimeSeconds: number;
  isCorrect: boolean;
  difficultyServed: Difficulty;
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

export default function AdaptiveQuizClient({
  quizId,
  courseId,
}: {
  quizId: string;
  courseId: string;
  title?: string;
  description?: string | null;
}) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizMeta | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);
  const [savedAnswers, setSavedAnswers] = useState<SavedAdaptiveAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const questionStartRef = useRef<number | null>(null);

  useEffect(() => {
    async function startQuiz() {
      try {
        const res = await fetch("/api/adaptive-quiz/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quizId, courseId }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) {
          setError(data.error || "Failed to start adaptive quiz.");
          setLoading(false);
          return;
        }

        setQuiz(data.quiz);
        setCurrentQuestion(data.firstQuestion);
        setLoading(false);
        questionStartRef.current = Date.now();
      } catch (err) {
        console.error("Adaptive start error:", err);
        setError("Something went wrong while starting the adaptive quiz.");
        setLoading(false);
      }
    }

    void startQuiz();
  }, [quizId, courseId]);

  const renderedChoices = useMemo(() => {
    if (!currentQuestion || currentQuestion.questionType !== "MULTIPLE_CHOICE") {
      return [];
    }

    const choices: ShuffledChoice[] = [
      { originalKey: "A", text: currentQuestion.optionA ?? "" },
      { originalKey: "B", text: currentQuestion.optionB ?? "" },
      { originalKey: "C", text: currentQuestion.optionC ?? "" },
      { originalKey: "D", text: currentQuestion.optionD ?? "" },
    ];

    return quiz?.shuffleOptions ? shuffleArray(choices) : choices;
  }, [currentQuestion, quiz]);

  async function finishAdaptive(finalAnswers: SavedAdaptiveAnswer[]) {
    try {
      const res = await fetch("/api/adaptive-quiz/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId,
          courseId,
          answers: finalAnswers,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setSubmitting(false);
        setError(data.error || "Failed to finish adaptive quiz.");
        return;
      }

      setSubmitting(false);
      alert(`Adaptive quiz submitted. Score: ${data.score}`);
      router.push(`/student/courses/${courseId}`);
    } catch (err) {
      console.error("Adaptive finish error:", err);
      setSubmitting(false);
      setError("Something went wrong while finishing the adaptive quiz.");
    }
  }

  function validateCurrentAnswer() {
    if (!currentQuestion) return false;

    if (currentQuestion.questionType === "MULTIPLE_CHOICE") {
      return ["A", "B", "C", "D"].includes(currentAnswer);
    }

    return currentAnswer.trim().length > 0;
  }

  async function handleNext() {
    if (!currentQuestion) return;

    setError("");

    if (!validateCurrentAnswer()) {
      setError("Please answer the current question.");
      return;
    }

    setSubmitting(true);

    const startedAt = questionStartRef.current ?? Date.now();
    const responseTimeSeconds = Math.max(
      1,
      Math.floor((Date.now() - startedAt) / 1000)
    );

    try {
      const updatedSeenIds = [...seenQuestionIds, currentQuestion.id];

      const res = await fetch("/api/adaptive-quiz/next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId,
          currentQuestionId: currentQuestion.id,
          selectedAnswer: currentAnswer,
          responseTimeSeconds,
          currentAttemptSeenQuestionIds: updatedSeenIds,
          answeredCount: savedAnswers.length + 1,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setSubmitting(false);
        setError(data.error || "Failed to get next adaptive question.");
        return;
      }

      const newSavedAnswers = [...savedAnswers, data.result as SavedAdaptiveAnswer];

      if (data.done) {
        void finishAdaptive(newSavedAnswers);
        return;
      }

      setSavedAnswers(newSavedAnswers);
      setSeenQuestionIds(updatedSeenIds);
      setCurrentQuestion(data.nextQuestion as AdaptiveQuestion);
      setCurrentAnswer("");
      setSubmitting(false);
      questionStartRef.current = Date.now();
    } catch (err) {
      console.error("Adaptive next error:", err);
      setSubmitting(false);
      setError("Something went wrong while progressing the adaptive quiz.");
    }
  }

  function renderQuestionInput() {
    if (!currentQuestion) return null;

    if (currentQuestion.questionType === "MULTIPLE_CHOICE") {
      return (
        <div className="mt-4 space-y-3">
          {renderedChoices.map((choice, index) => {
            const label = ["A", "B", "C", "D"][index];

            return (
              <label
                key={choice.originalKey}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={choice.originalKey}
                  checked={currentAnswer === choice.originalKey}
                  onChange={() => setCurrentAnswer(choice.originalKey)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">{label}.</span>{" "}
                  {choice.text}
                </span>
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <input
        className="mt-4 w-full rounded-2xl border border-gray-300 bg-white p-4 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
        type="text"
        placeholder={
          currentQuestion.questionType === "COMPUTATIONAL"
            ? "Enter your computed answer"
            : "Enter your answer"
        }
        value={currentAnswer}
        onChange={(e) => setCurrentAnswer(e.target.value)}
      />
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p>Loading adaptive quiz...</p>
        </div>
      </main>
    );
  }

  if (error && !currentQuestion && !quiz) {
    return (
      <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!quiz || !currentQuestion) {
    return (
      <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p>No adaptive question available.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 p-8 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Adaptive Quiz
          </p>
          <h1 className="mt-4 text-3xl font-bold">{quiz.title}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {quiz.description || "No description"}
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-gray-300 px-4 py-2">
              Question {savedAnswers.length + 1} of {quiz.maxItems}
            </span>
            <span className="rounded-full border border-gray-300 px-4 py-2">
              Difficulty: {currentQuestion.difficulty}
            </span>
            <span className="rounded-full border border-gray-300 px-4 py-2">
              Type: {currentQuestion.questionType}
            </span>
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <p className="font-semibold">{currentQuestion.questionText}</p>
            {renderQuestionInput()}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={submitting}
            className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
          >
            {submitting
              ? "Processing..."
              : savedAnswers.length + 1 >= quiz.maxItems
              ? "Finish Adaptive Quiz"
              : "Next Question"}
          </button>
        </div>
      </div>
    </main>
  );
}