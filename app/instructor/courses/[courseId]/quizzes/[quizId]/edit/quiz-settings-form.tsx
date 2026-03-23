"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type QuizType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL"
  | "MIXED";

type TermCategory = "PRELIMS" | "MIDTERMS" | "FINALS";
type CloseMode = "none" | "specific" | "duration";

type Props = {
  courseId: string;
  quizId: string;
  initialData: {
    title: string;
    description: string;
    quizType: QuizType;
    term: TermCategory;
    maxAttempts: number;
    questionsPerAttempt: number | null;
    shuffleOptions: boolean;
    avoidRepeatedQuestions: boolean;
    adaptiveMode: boolean;
    opensAt: string | null;
    closesAt: string | null;
    attemptTimeLimitMinutes: number | null;
  };
};

type ApiResponse = {
  error?: string;
};

function isoToLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatLocalDateTime(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString();
}

export default function EditQuizSettingsForm({
  courseId,
  quizId,
  initialData,
}: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [quizType, setQuizType] = useState<QuizType>(initialData.quizType);
  const [term, setTerm] = useState<TermCategory>(initialData.term);
  const [maxAttempts, setMaxAttempts] = useState(initialData.maxAttempts);
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState<number | "">(
    initialData.questionsPerAttempt ?? ""
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    initialData.shuffleOptions
  );
  const [avoidRepeatedQuestions, setAvoidRepeatedQuestions] = useState(
    initialData.avoidRepeatedQuestions
  );
  const [adaptiveMode, setAdaptiveMode] = useState(initialData.adaptiveMode);

  const [opensAtLocal, setOpensAtLocal] = useState(
    isoToLocalInput(initialData.opensAt)
  );
  const [closesAtLocal, setClosesAtLocal] = useState(
    isoToLocalInput(initialData.closesAt)
  );
  const [attemptTimeLimitMinutes, setAttemptTimeLimitMinutes] = useState<number | "">(
    initialData.attemptTimeLimitMinutes ?? ""
  );

  const [closeMode, setCloseMode] = useState<CloseMode>(
    initialData.opensAt && initialData.closesAt ? "specific" : "none"
  );
  const [availabilityDurationMinutes, setAvailabilityDurationMinutes] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const computedClosePreview = useMemo(() => {
    if (!opensAtLocal) return "";

    if (closeMode === "specific") {
      return closesAtLocal;
    }

    if (closeMode === "duration" && availabilityDurationMinutes !== "") {
      const openDate = new Date(opensAtLocal);
      if (Number.isNaN(openDate.getTime())) return "";
      const closeDate = new Date(
        openDate.getTime() + Number(availabilityDurationMinutes) * 60 * 1000
      );
      const offset = closeDate.getTimezoneOffset();
      const localDate = new Date(closeDate.getTime() - offset * 60 * 1000);
      return localDate.toISOString().slice(0, 16);
    }

    return "";
  }, [opensAtLocal, closeMode, closesAtLocal, availabilityDurationMinutes]);

  function buildSchedule() {
    const opensAt = toIsoOrNull(opensAtLocal);

    if (!opensAtLocal) {
      return {
        opensAt: null as string | null,
        closesAt: null as string | null,
      };
    }

    if (closeMode === "specific") {
      return {
        opensAt,
        closesAt: toIsoOrNull(closesAtLocal),
      };
    }

    if (closeMode === "duration") {
      if (!availabilityDurationMinutes || !opensAt) {
        return {
          opensAt,
          closesAt: null as string | null,
        };
      }

      const closeDate = new Date(
        new Date(opensAt).getTime() + Number(availabilityDurationMinutes) * 60 * 1000
      );

      return {
        opensAt,
        closesAt: closeDate.toISOString(),
      };
    }

    return {
      opensAt,
      closesAt: null as string | null,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (opensAtLocal && new Date(opensAtLocal) < new Date()) {
      setLoading(false);
      setError("Open date/time cannot be in the past.");
      return;
    }

    if (
      closeMode === "specific" &&
      opensAtLocal &&
      closesAtLocal &&
      new Date(closesAtLocal) <= new Date(opensAtLocal)
    ) {
      setLoading(false);
      setError("Close date/time must be later than the open date/time.");
      return;
    }

    const schedule = buildSchedule();

    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          quizType,
          term,
          maxAttempts,
          questionsPerAttempt:
            questionsPerAttempt === "" ? null : Number(questionsPerAttempt),
          shuffleOptions,
          avoidRepeatedQuestions,
          adaptiveMode,
          opensAt: schedule.opensAt,
          closesAt: schedule.closesAt,
          attemptTimeLimitMinutes:
            attemptTimeLimitMinutes === "" ? null : Number(attemptTimeLimitMinutes),
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to update quiz settings.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}/quizzes/${quizId}`);
      router.refresh();
    } catch (err) {
      console.error("Edit quiz settings error:", err);
      setLoading(false);
      setError("Something went wrong while updating the quiz.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Quiz title
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Quiz description
            </label>
            <textarea
              rows={5}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Term
              </label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value as TermCategory)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              >
                <option value="PRELIMS">Prelims</option>
                <option value="MIDTERMS">Midterms</option>
                <option value="FINALS">Finals</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Quiz type
              </label>
              <select
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                value={quizType}
                onChange={(e) => setQuizType(e.target.value as QuizType)}
              >
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="IDENTIFICATION">Identification</option>
                <option value="ESSAY">Essay</option>
                <option value="COMPUTATIONAL">Computational</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Max attempts
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Items per attempt
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                value={questionsPerAttempt}
                onChange={(e) =>
                  setQuestionsPerAttempt(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Attempt time limit (minutes)
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                value={attemptTimeLimitMinutes}
                onChange={(e) =>
                  setAttemptTimeLimitMinutes(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Quiz Availability
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Open date and time
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  value={opensAtLocal}
                  onChange={(e) => {
                    const nextOpen = e.target.value;
                    setOpensAtLocal(nextOpen);

                    if (
                      closeMode === "specific" &&
                      closesAtLocal &&
                      nextOpen &&
                      new Date(closesAtLocal) <= new Date(nextOpen)
                    ) {
                      setClosesAtLocal("");
                    }
                  }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Close mode
                </label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  value={closeMode}
                  onChange={(e) => setCloseMode(e.target.value as CloseMode)}
                >
                  <option value="none">No close schedule</option>
                  <option value="specific">Set exact close date/time</option>
                  <option value="duration">Use duration after opening</option>
                </select>
              </div>

              {closeMode === "specific" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Close date and time
                  </label>
                  <input
                    type="datetime-local"
                    min={opensAtLocal || undefined}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                    value={closesAtLocal}
                    onChange={(e) => setClosesAtLocal(e.target.value)}
                  />
                </div>
              )}

              {closeMode === "duration" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Availability duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                    value={availabilityDurationMinutes}
                    onChange={(e) =>
                      setAvailabilityDurationMinutes(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                  />
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">Schedule Preview</p>
                <p className="mt-2">
                  <span className="font-medium">Opens:</span>{" "}
                  {formatLocalDateTime(opensAtLocal)}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Closes:</span>{" "}
                  {computedClosePreview
                    ? formatLocalDateTime(computedClosePreview)
                    : "No close schedule"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Shuffle answer choices each attempt
              </span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={avoidRepeatedQuestions}
                onChange={(e) => setAvoidRepeatedQuestions(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Avoid repeated questions on retake
              </span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={adaptiveMode}
                onChange={(e) => setAdaptiveMode(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Enable rule-based adaptive assessment
              </span>
            </label>
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
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
          Notes
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Term Category</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              This quiz contributes to the selected term grade and the semestral grade.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Open date restriction</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              You cannot change the open date/time to a value that has already passed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}