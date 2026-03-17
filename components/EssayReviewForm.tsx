"use client";

import { useState } from "react";

type Props = {
  quizAnswerId: string;
  initialScore: number | null;
  initialFeedback: string | null;
};

export default function EssayReviewForm({
  quizAnswerId,
  initialScore,
  initialFeedback,
}: Props) {
  const [manualScore, setManualScore] = useState<number | "">(
    initialScore ?? ""
  );
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/essay-reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizAnswerId,
          manualScore: manualScore === "" ? null : Number(manualScore),
          instructorFeedback: feedback,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as { error?: string; message?: string }) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to save review.");
        return;
      }

      setLoading(false);
      setMessage(data.message || "Saved.");
    } catch (err) {
      console.error("Essay review save error:", err);
      setLoading(false);
      setError("Something went wrong while saving the review.");
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <input
        className="w-full rounded border p-3"
        type="number"
        min={0}
        max={100}
        placeholder="Manual score (0-100)"
        value={manualScore}
        onChange={(e) =>
          setManualScore(e.target.value === "" ? "" : Number(e.target.value))
        }
      />

      <textarea
        className="w-full rounded border p-3"
        rows={4}
        placeholder="Instructor feedback"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />

      {error && <p className="text-red-600">{error}</p>}
      {message && <p className="text-green-600">{message}</p>}

      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-white"
      >
        {loading ? "Saving..." : "Save Review"}
      </button>
    </div>
  );
}