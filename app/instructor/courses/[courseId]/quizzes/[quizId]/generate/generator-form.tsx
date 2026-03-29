"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DifficultyInputs = {
  easy: number | "";
  medium: number | "";
  hard: number | "";
};

type ApiResponse = {
  error?: string;
  message?: string;
  createdCount?: number;
};

type Props = {
  courseId: string;
  quizId: string;
  quizTitle: string;
};

function toNumber(value: number | "") {
  return value === "" ? 0 : Number(value);
}

function SectionCard({
  title,
  description,
  values,
  onChange,
  accent,
}: {
  title: string;
  description: string;
  values: DifficultyInputs;
  onChange: (key: keyof DifficultyInputs, value: number | "") => void;
  accent: string;
}) {
  const total =
    toNumber(values.easy) + toNumber(values.medium) + toNumber(values.hard);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${accent}`}>
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
          Total: {total}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Easy
          </label>
          <input
            type="number"
            min={0}
            value={values.easy}
            onChange={(e) =>
              onChange("easy", e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Medium
          </label>
          <input
            type="number"
            min={0}
            value={values.medium}
            onChange={(e) =>
              onChange("medium", e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Hard
          </label>
          <input
            type="number"
            min={0}
            value={values.hard}
            onChange={(e) =>
              onChange("hard", e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
          />
        </div>
      </div>
    </div>
  );
}

export default function AiQuestionGeneratorForm({
  quizId,
  quizTitle,
}: Props) {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  const [multipleChoice, setMultipleChoice] = useState<DifficultyInputs>({
    easy: "",
    medium: "",
    hard: "",
  });

  const [identification, setIdentification] = useState<DifficultyInputs>({
    easy: "",
    medium: "",
    hard: "",
  });

  const [computational, setComputational] = useState<DifficultyInputs>({
    easy: "",
    medium: "",
    hard: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const totals = useMemo(() => {
    const mcq =
      toNumber(multipleChoice.easy) +
      toNumber(multipleChoice.medium) +
      toNumber(multipleChoice.hard);

    const idn =
      toNumber(identification.easy) +
      toNumber(identification.medium) +
      toNumber(identification.hard);

    const comp =
      toNumber(computational.easy) +
      toNumber(computational.medium) +
      toNumber(computational.hard);

    return {
      multipleChoice: mcq,
      identification: idn,
      computational: comp,
      grandTotal: mcq + idn + comp,
    };
  }, [multipleChoice, identification, computational]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (totals.grandTotal <= 0) {
      setError("Please request at least one question.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/quiz-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId,
          topic,
          sourceText,
          additionalInstructions,
          multipleChoice: {
            easy: toNumber(multipleChoice.easy),
            medium: toNumber(multipleChoice.medium),
            hard: toNumber(multipleChoice.hard),
          },
          identification: {
            easy: toNumber(identification.easy),
            medium: toNumber(identification.medium),
            hard: toNumber(identification.hard),
          },
          computational: {
            easy: toNumber(computational.easy),
            medium: toNumber(computational.medium),
            hard: toNumber(computational.hard),
          },
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to generate questions.");
        return;
      }

      setLoading(false);
      setMessage(
        data.message || `${data.createdCount ?? totals.grandTotal} question(s) generated successfully.`
      );
      router.refresh();
    } catch (err) {
      console.error("Generate questions UI error:", err);
      setLoading(false);
      setError("Something went wrong while generating questions.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Quiz
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">{quizTitle}</h2>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Topic / Coverage
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Example: Database normalization and SQL joins"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Source Text / Notes
            </label>
            <textarea
              rows={6}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste lesson notes, module coverage, or topic constraints here..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Additional Instructions
            </label>
            <textarea
              rows={4}
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Example: Avoid trick questions. Keep wording concise."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>

          <SectionCard
            title="Multiple Choice"
            description="Set the number of easy, medium, and hard multiple choice questions."
            values={multipleChoice}
            onChange={(key, value) =>
              setMultipleChoice((prev) => ({ ...prev, [key]: value }))
            }
            accent="text-emerald-700"
          />

          <SectionCard
            title="Identification"
            description="Set the number of easy, medium, and hard identification questions."
            values={identification}
            onChange={(key, value) =>
              setIdentification((prev) => ({ ...prev, [key]: value }))
            }
            accent="text-amber-700"
          />

          <SectionCard
            title="Computational"
            description="Set the number of easy, medium, and hard computational questions."
            values={computational}
            onChange={(key, value) =>
              setComputational((prev) => ({ ...prev, [key]: value }))
            }
            accent="text-blue-700"
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Generating..." : `Generate ${totals.grandTotal} Question(s)`}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
          Requested Totals
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-semibold">Multiple Choice</p>
            <p className="mt-2 text-sm text-gray-300">
              Easy: {toNumber(multipleChoice.easy)} | Medium: {toNumber(multipleChoice.medium)} | Hard: {toNumber(multipleChoice.hard)}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              Total: {totals.multipleChoice}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-semibold">Identification</p>
            <p className="mt-2 text-sm text-gray-300">
              Easy: {toNumber(identification.easy)} | Medium: {toNumber(identification.medium)} | Hard: {toNumber(identification.hard)}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              Total: {totals.identification}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-semibold">Computational</p>
            <p className="mt-2 text-sm text-gray-300">
              Easy: {toNumber(computational.easy)} | Medium: {toNumber(computational.medium)} | Hard: {toNumber(computational.hard)}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              Total: {totals.computational}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.15em] text-gray-300">
              Grand Total
            </p>
            <p className="mt-2 text-4xl font-bold">{totals.grandTotal}</p>
          </div>

          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
            <p className="font-semibold text-red-200">Essay Hidden from UI</p>
            <p className="mt-2 text-sm leading-6 text-red-100/90">
              Essay is intentionally not available here because it requires manual
              checking and should not participate in the rule-based adaptive flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}