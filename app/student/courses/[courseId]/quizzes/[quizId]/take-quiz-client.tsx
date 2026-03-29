"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentQuestion = {
  id: string;
  questionText: string;
  questionType: "MULTIPLE_CHOICE" | "IDENTIFICATION" | "ESSAY" | "COMPUTATIONAL";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timeThresholdSeconds: number;
  options: { key: string; text: string }[];
};

type QuizMeta = {
  id: string;
  title: string;
  description: string | null;
  attemptTimeLimitMinutes: number | null;
  opensAt: string | null;
  closesAt: string | null;
};

type StartAttemptResponse = {
  error?: string;
  finished?: boolean;
  attemptId?: string;
  redirectTo?: string;
  quiz?: {
    id: string;
    title: string;
    description: string | null;
  };
  question?: CurrentQuestion;
  progress?: {
    answeredCount: number;
    currentNumber: number;
    totalQuestions: number;
  };
  remainingTimeSeconds?: number | null;
};

type AnswerResponse = {
  error?: string;
  finished?: boolean;
  attemptId?: string;
  redirectTo?: string;
  question?: CurrentQuestion;
  progress?: {
    answeredCount: number;
    currentNumber: number;
    totalQuestions: number;
  };
  remainingTimeSeconds?: number | null;
};

type Props = {
  courseId: string;
  quiz: QuizMeta;
};

function formatSeconds(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function TakeQuizClient({ courseId, quiz }: Props) {
  const router = useRouter();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentNumber, setCurrentNumber] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [remainingTimeSeconds, setRemainingTimeSeconds] = useState<number | null>(
    quiz.attemptTimeLimitMinutes ? quiz.attemptTimeLimitMinutes * 60 : null
  );

  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [fullscreenAccepted, setFullscreenAccepted] = useState(false);
  const [mustReturnToFullscreen, setMustReturnToFullscreen] = useState(false);
  const [visibilityViolations, setVisibilityViolations] = useState(0);

  const questionStartedAtRef = useRef<number>(0);
  const autoSubmittedRef = useRef(false);
  const lastViolationAtRef = useRef(0);
  const violationCountRef = useRef(0);

  const finishViaRedirect = useCallback(
    (redirectTo: string) => {
      router.replace(redirectTo);
      router.refresh();
    },
    [router]
  );

  const answerCurrentQuestion = useCallback(
    async (forceFinish = false) => {
      if (!attemptId || !currentQuestion) return;
      if (submitting) return;
      if (!forceFinish && mustReturnToFullscreen) {
        setError("Return to fullscreen before continuing.");
        return;
      }
      if (forceFinish && autoSubmittedRef.current) return;

      if (forceFinish) {
        autoSubmittedRef.current = true;
      }

      setSubmitting(true);
      setError("");

      const responseTimeSeconds = Math.max(
        0,
        Math.floor((Date.now() - questionStartedAtRef.current) / 1000)
      );

      try {
        const res = await fetch(`/api/quiz-attempts/${attemptId}/answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            selectedAnswer: currentAnswer,
            responseTimeSeconds,
            forceFinish,
          }),
        });

        const text = await res.text();
        const data = text ? (JSON.parse(text) as AnswerResponse) : {};

        if (!res.ok) {
          setSubmitting(false);
          setError(data.error || "Failed to submit your answer.");
          autoSubmittedRef.current = false;
          return;
        }

        if (data.finished) {
          finishViaRedirect(
            data.redirectTo ??
              `/student/courses/${courseId}/quizzes/${quiz.id}/review?attemptId=${attemptId}`
          );
          return;
        }

        if (!data.question || !data.progress) {
          setSubmitting(false);
          setError("The next question could not be loaded.");
          autoSubmittedRef.current = false;
          return;
        }

        setCurrentQuestion(data.question);
        setCurrentAnswer("");
        setAnsweredCount(data.progress.answeredCount);
        setCurrentNumber(data.progress.currentNumber);
        setTotalQuestions(data.progress.totalQuestions);
        setRemainingTimeSeconds(data.remainingTimeSeconds ?? null);
        questionStartedAtRef.current = Date.now();

        setSubmitting(false);
      } catch (err) {
        console.error("Answer current question UI error:", err);
        setSubmitting(false);
        setError("Something went wrong while sending your answer.");
        autoSubmittedRef.current = false;
      }
    },
    [
      attemptId,
      courseId,
      currentAnswer,
      currentQuestion,
      finishViaRedirect,
      mustReturnToFullscreen,
      quiz.id,
      submitting,
    ]
  );

  const registerViolation = useCallback(
    (reason: string) => {
      if (!started || submitting) return;

      const now = Date.now();
      if (now - lastViolationAtRef.current < 1200) {
        return;
      }

      lastViolationAtRef.current = now;
      violationCountRef.current += 1;

      const nextCount = violationCountRef.current;

      setVisibilityViolations(nextCount);
      setMustReturnToFullscreen(true);
      setFullscreenAccepted(Boolean(document.fullscreenElement));

      if (nextCount >= 3) {
        setWarning(
          "Maximum violations reached. Your quiz is being submitted automatically."
        );

        window.setTimeout(() => {
          void answerCurrentQuestion(true);
        }, 0);
      } else {
        setWarning(
          `${reason} detected. Return to fullscreen to continue. Violation ${nextCount}/3.`
        );
      }
    },
    [answerCurrentQuestion, started, submitting]
  );

  useEffect(() => {
    if (!started || remainingTimeSeconds === null || submitting) return;

    const timer = window.setInterval(() => {
      setRemainingTimeSeconds((prev) => {
        if (prev === null) return null;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, remainingTimeSeconds, submitting]);

  useEffect(() => {
    if (!started || remainingTimeSeconds === null || submitting) return;
    if (remainingTimeSeconds > 0) return;

    const timer = window.setTimeout(() => {
      void answerCurrentQuestion(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [started, remainingTimeSeconds, submitting, answerCurrentQuestion]);

  useEffect(() => {
    if (!started) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        registerViolation("Tab/app switch");
      }
    };

    const handleWindowBlur = () => {
      registerViolation("Focus loss");
    };

    const handlePageHide = () => {
      registerViolation("Page hide");
    };

    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);

      setFullscreenAccepted(isFullscreen);

      if (!isFullscreen) {
        registerViolation("Fullscreen exit");
      } else {
        setMustReturnToFullscreen(false);
        setWarning((prev) =>
          prev.includes("Violation") || prev.includes("fullscreen") ? "" : prev
        );
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [registerViolation, started]);

  async function requestFullscreenAgain() {
    setError("");

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      setFullscreenAccepted(true);
      setMustReturnToFullscreen(false);
      setWarning("");
    } catch (err) {
      console.error("Return to fullscreen error:", err);
      setError("Unable to enter fullscreen. Please allow fullscreen to continue.");
    }
  }

  async function startOrResumeQuiz() {
    setError("");
    setWarning("");
    setStarting(true);

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      const res = await fetch("/api/quiz-attempts/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId: quiz.id,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as StartAttemptResponse) : {};

      if (!res.ok) {
        setStarting(false);
        setError(data.error || "Failed to start the quiz.");
        return;
      }

      if (data.finished) {
        finishViaRedirect(
          data.redirectTo ??
            `/student/courses/${courseId}/quizzes/${quiz.id}/review`
        );
        return;
      }

      if (!data.attemptId || !data.question || !data.progress) {
        setStarting(false);
        setError("The quiz attempt could not be started.");
        return;
      }

      setAttemptId(data.attemptId);
      setCurrentQuestion(data.question);
      setCurrentAnswer("");
      setAnsweredCount(data.progress.answeredCount);
      setCurrentNumber(data.progress.currentNumber);
      setTotalQuestions(data.progress.totalQuestions);
      setRemainingTimeSeconds(data.remainingTimeSeconds ?? null);
      setStarted(true);
      setFullscreenAccepted(true);
      setMustReturnToFullscreen(false);
      questionStartedAtRef.current = Date.now();

      setStarting(false);
    } catch (err) {
      console.error("Start quiz error:", err);
      setStarting(false);
      setError("Please allow fullscreen mode before starting the quiz.");
    }
  }

  const interactionLocked = started && mustReturnToFullscreen;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                Quiz
              </p>
              <h1 className="mt-3 text-3xl font-bold">{quiz.title}</h1>
              {quiz.description && (
                <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
                  {quiz.description}
                </p>
              )}
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                  Progress
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {answeredCount} / {totalQuestions || "?"} answered
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                  Time Left
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {remainingTimeSeconds === null
                    ? "No limit"
                    : formatSeconds(remainingTimeSeconds)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                  Fullscreen
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {fullscreenAccepted ? "Active" : "Required"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                  Violations
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {visibilityViolations} / 3
                </p>
              </div>
            </div>
          </div>

          {!started && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-800">Before you begin</p>
              <ul className="mt-3 space-y-2 text-sm text-amber-700">
                <li>• Only the current question will be shown.</li>
                <li>• The next question is decided by the server after each answer.</li>
                <li>• Fullscreen is required for this quiz.</li>
                <li>• Exiting fullscreen or leaving the quiz screen counts as a violation.</li>
              </ul>

              <button
                onClick={() => void startOrResumeQuiz()}
                disabled={starting}
                className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                {starting ? "Preparing Quiz..." : "Start / Resume Quiz"}
              </button>
            </div>
          )}

          {interactionLocked && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-semibold text-red-800">
                Fullscreen is required to continue.
              </p>
              <p className="mt-2 text-sm text-red-700">
                Answering is locked until you return to fullscreen mode.
              </p>

              <button
                onClick={() => void requestFullscreenAgain()}
                className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Return to Fullscreen
              </button>
            </div>
          )}

          {warning && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {warning}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {started && currentQuestion && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-500">
                  Question {currentNumber} of {totalQuestions}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-700">
                    {currentQuestion.questionType}
                  </span>
                  <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-700">
                    {currentQuestion.difficulty}
                  </span>
                  <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-700">
                    {currentQuestion.timeThresholdSeconds}s threshold
                  </span>
                </div>
              </div>
            </div>

            <h2 className="mt-6 text-2xl font-bold leading-relaxed">
              {currentQuestion.questionText}
            </h2>

            <div className="mt-6">
              {currentQuestion.questionType === "MULTIPLE_CHOICE" ? (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <label
                      key={`${currentQuestion.id}-${option.key}`}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-white"
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.key}
                        checked={currentAnswer === option.key}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        disabled={submitting || interactionLocked}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {option.key}. {option.text}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : currentQuestion.questionType === "ESSAY" ? (
                <textarea
                  rows={8}
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  disabled={submitting || interactionLocked}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="Type your essay answer here..."
                />
              ) : (
                <input
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  disabled={submitting || interactionLocked}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder={
                    currentQuestion.questionType === "COMPUTATIONAL"
                      ? "Enter your final answer"
                      : "Enter your answer"
                  }
                />
              )}
            </div>

            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <button
                onClick={() => void requestFullscreenAgain()}
                disabled={!started}
                className="rounded-xl border border-gray-300 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Fullscreen
              </button>

              <div className="flex flex-wrap gap-3">
                {currentNumber < totalQuestions ? (
                  <button
                    onClick={() => void answerCurrentQuestion(false)}
                    disabled={submitting || interactionLocked}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Submit Answer & Next"}
                  </button>
                ) : (
                  <button
                    onClick={() => void answerCurrentQuestion(true)}
                    disabled={submitting || interactionLocked}
                    className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Quiz"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}