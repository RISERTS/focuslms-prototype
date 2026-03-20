"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type OriginalOptionKey = "A" | "B" | "C" | "D";
type QuestionType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL";
type QuizType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL"
  | "MIXED";

type QuizQuestion = {
  id: string;
  questionText: string;
  questionType: QuestionType;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
};

type QuizData = {
  id: string;
  title: string;
  description: string | null;
  shuffleOptions: boolean;
  quizType: QuizType;
  attemptTimeLimitMinutes: number | null;
  opensAt: string | null;
  closesAt: string | null;
  questions: QuizQuestion[];
};

type Props = {
  courseId: string;
  quiz: QuizData;
};

type ShuffledChoice = {
  originalKey: OriginalOptionKey;
  text: string;
};

type AnswerValue = string;

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function TakeQuizClient({ courseId, quiz }: Props) {
  const router = useRouter();
  const startTimeRef = useRef<number | null>(null);
  const submitStartedRef = useRef(false);

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [violations, setViolations] = useState(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(
    quiz.attemptTimeLimitMinutes ? quiz.attemptTimeLimitMinutes * 60 : null
  );

  const renderedQuestions = useMemo(() => {
    return quiz.questions.map((q) => {
      const choices: ShuffledChoice[] =
        q.questionType === "MULTIPLE_CHOICE"
          ? [
              { originalKey: "A", text: q.optionA ?? "" },
              { originalKey: "B", text: q.optionB ?? "" },
              { originalKey: "C", text: q.optionC ?? "" },
              { originalKey: "D", text: q.optionD ?? "" },
            ]
          : [];

      return {
        ...q,
        renderedChoices:
          q.questionType === "MULTIPLE_CHOICE" && quiz.shuffleOptions
            ? shuffleArray(choices)
            : choices,
      };
    });
  }, [quiz]);

  function choose(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function isAnswered(question: QuizQuestion): boolean {
    const value = answers[question.id];

    if (question.questionType === "MULTIPLE_CHOICE") {
      return value === "A" || value === "B" || value === "C" || value === "D";
    }

    return typeof value === "string" && value.trim().length > 0;
  }

  async function startQuiz() {
    setError("");

    if (!document.fullscreenEnabled) {
      setError("Fullscreen is required, but this browser does not allow it here.");
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
      startTimeRef.current = Date.now();
      setStarted(true);

      await fetch("/api/activity-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionType: "START_QUIZ",
          courseId,
          targetId: quiz.id,
        }),
      });
    } catch (err) {
      console.error("Start quiz fullscreen error:", err);
      setError("You must allow fullscreen to start this quiz.");
    }
  }

  async function submitQuiz(autoFillMissing: boolean) {
    if (submitStartedRef.current) return;
    submitStartedRef.current = true;

    setLoading(true);
    setError("");

    const startedAt = startTimeRef.current ?? Date.now();
    const elapsedSeconds = Math.max(
      1,
      Math.floor((Date.now() - startedAt) / 1000)
    );

    const avgPerQuestion = Math.max(
      1,
      Math.floor(elapsedSeconds / renderedQuestions.length)
    );

    const payloadAnswers = renderedQuestions.map((q) => ({
      questionId: q.id,
      selectedAnswer: autoFillMissing ? answers[q.id] ?? "" : answers[q.id],
      responseTimeSeconds: avgPerQuestion,
    }));

    try {
      const res = await fetch("/api/quiz-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId: quiz.id,
          totalElapsedSeconds: elapsedSeconds,
          answers: payloadAnswers,
        }),
      });

      const text = await res.text();
      const data = text
        ? (JSON.parse(text) as { error?: string; score?: number })
        : {};

      if (!res.ok) {
        setLoading(false);
        submitStartedRef.current = false;
        setError(data.error || "Failed to submit quiz.");
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }

      setLoading(false);
      alert(
        typeof data.score === "number"
          ? `Quiz submitted. Score: ${data.score.toFixed(2)}`
          : "Quiz submitted successfully."
      );
      router.push(`/student/courses/${courseId}`);
      router.refresh();
    } catch (err) {
      console.error("Submit quiz error:", err);
      setLoading(false);
      submitStartedRef.current = false;
      setError("Something went wrong while submitting the quiz.");
    }
  }

  async function handleSubmit() {
    setError("");

    const unanswered = renderedQuestions.some((q) => !isAnswered(q));
    if (unanswered) {
      setError("Please answer all questions.");
      return;
    }

    await submitQuiz(false);
  }

  useEffect(() => {
    if (!started) return;

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setViolations((prev) => prev + 1);
        setError("Do not exit fullscreen during the quiz.");
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        setViolations((prev) => prev + 1);
        setError("Do not switch tabs or hide the quiz page.");
      }
    };

    const onBlur = () => {
      setViolations((prev) => prev + 1);
      setError("Do not leave the quiz window during the attempt.");
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [started]);

  useEffect(() => {
    if (!started || timeLeftSeconds === null) return;
    if (timeLeftSeconds <= 0) {
      void submitQuiz(true);
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeftSeconds((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, timeLeftSeconds]);

  useEffect(() => {
    if (!started) return;
    if (violations >= 3) {
      void submitQuiz(true);
    }
  }, [violations, started]);

  function renderQuestionInput(question: (typeof renderedQuestions)[number]) {
    if (question.questionType === "MULTIPLE_CHOICE") {
      return (
        <div className="mt-3 space-y-2">
          {question.renderedChoices.map((choice, choiceIndex) => {
            const visualLabel = ["A", "B", "C", "D"][choiceIndex];

            return (
              <label
                key={`${question.id}-${choice.originalKey}`}
                className="block"
              >
                <input
                  type="radio"
                  name={question.id}
                  value={choice.originalKey}
                  checked={answers[question.id] === choice.originalKey}
                  onChange={() => choose(question.id, choice.originalKey)}
                  className="mr-2"
                />
                {visualLabel}. {choice.text}
              </label>
            );
          })}
        </div>
      );
    }

    if (question.questionType === "ESSAY") {
      return (
        <textarea
          className="mt-3 w-full rounded border p-3"
          rows={6}
          placeholder="Write your answer here..."
          value={answers[question.id] ?? ""}
          onChange={(e) => choose(question.id, e.target.value)}
        />
      );
    }

    return (
      <input
        className="mt-3 w-full rounded border p-3"
        type="text"
        placeholder={
          question.questionType === "COMPUTATIONAL"
            ? "Enter your computed answer"
            : "Enter your answer"
        }
        value={answers[question.id] ?? ""}
        onChange={(e) => choose(question.id, e.target.value)}
      />
    );
  }

  if (!started) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="mt-2 text-gray-600">{quiz.description || "No description"}</p>

          <div className="mt-6 space-y-3 rounded-2xl bg-gray-50 p-5 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">Quiz rules</p>
            {quiz.opensAt && <p>Opens: {new Date(quiz.opensAt).toLocaleString()}</p>}
            {quiz.closesAt && <p>Closes: {new Date(quiz.closesAt).toLocaleString()}</p>}
            {quiz.attemptTimeLimitMinutes && (
              <p>Attempt time limit: {quiz.attemptTimeLimitMinutes} minute(s)</p>
            )}
            <p>Fullscreen is required to start.</p>
            <p>Switching tabs, leaving fullscreen, or leaving the quiz window increases your violation count.</p>
            <p>At 3 violations, the quiz is auto-submitted.</p>
          </div>

          {error && <p className="mt-4 text-red-600">{error}</p>}

          <button
            onClick={startQuiz}
            className="mt-6 rounded bg-black px-5 py-3 text-white"
          >
            Enter Fullscreen and Start Quiz
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <p className="text-sm text-gray-500">Quiz Type: {quiz.quizType}</p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            {timeLeftSeconds !== null && (
              <span className="rounded-full bg-black px-4 py-2 font-semibold text-white">
                Time Left: {formatSeconds(Math.max(0, timeLeftSeconds))}
              </span>
            )}
            <span className="rounded-full border border-red-300 px-4 py-2 text-red-700">
              Violations: {violations}/3
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {renderedQuestions.map((q, index) => (
            <div key={q.id} className="rounded border p-4 bg-white">
              <p className="font-semibold">
                {index + 1}. {q.questionText}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Type: {q.questionType}
              </p>

              {renderQuestionInput(q)}
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
      </div>
    </main>
  );
}