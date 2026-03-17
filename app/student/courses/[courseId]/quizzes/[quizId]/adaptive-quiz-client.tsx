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
        <div className="mt-4 space-y-2">
          {renderedChoices.map((choice, index) => {
            const label = ["A", "B", "C", "D"][index];

            return (
              <label key={choice.originalKey} className="block">
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={choice.originalKey}
                  checked={currentAnswer === choice.originalKey}
                  onChange={() => setCurrentAnswer(choice.originalKey)}
                  className="mr-2"
                />
                {label}. {choice.text}
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <input
        className="mt-4 w-full rounded border p-3"
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
      <main className="min-h-screen p-8">
        <p>Loading adaptive quiz...</p>
      </main>
    );
  }

  if (error && !currentQuestion && !quiz) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!quiz || !currentQuestion) {
    return (
      <main className="min-h-screen p-8">
        <p>No adaptive question available.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">{quiz.title}</h1>
      <p className="mt-2 text-gray-600">{quiz.description || "No description"}</p>

      <p className="mt-4 text-sm text-gray-500">
        Question {savedAnswers.length + 1} of {quiz.maxItems}
      </p>

      <div className="mt-6 rounded border p-4">
        <p className="font-semibold">{currentQuestion.questionText}</p>
        <p className="mt-2 text-sm text-gray-500">
          Difficulty: {currentQuestion.difficulty} | Type: {currentQuestion.questionType}
        </p>

        {renderQuestionInput()}
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      <button
        onClick={handleNext}
        disabled={submitting}
        className="mt-6 rounded bg-black px-4 py-2 text-white"
      >
        {submitting
          ? "Processing..."
          : savedAnswers.length + 1 >= quiz.maxItems
          ? "Finish Adaptive Quiz"
          : "Next Question"}
      </button>
    </main>
  );
}