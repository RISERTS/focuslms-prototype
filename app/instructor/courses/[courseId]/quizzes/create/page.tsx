"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type ApiErrorResponse = {
  error?: string;
};

export default function CreateQuizPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId, title, description }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiErrorResponse & { id?: string }) : {};

      if (!res.ok || !data.id) {
        setLoading(false);
        setError(data.error || "Failed to create quiz.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}/quizzes/${data.id}`);
    } catch (err) {
      console.error("Create quiz error:", err);
      setLoading(false);
      setError("Something went wrong while creating the quiz.");
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Create Quiz</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        <input
          className="w-full rounded border p-3"
          placeholder="Quiz title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full rounded border p-3"
          placeholder="Quiz description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white"
        >
          {loading ? "Creating..." : "Create Quiz"}
        </button>
      </form>
    </main>
  );
}
