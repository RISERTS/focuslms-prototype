"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApiErrorResponse = {
  error?: string;
};

export default function CreateCoursePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description }),
      });

      const text = await res.text();
      let data: ApiErrorResponse = {};

      try {
        data = text ? (JSON.parse(text) as ApiErrorResponse) : {};
      } catch {
        console.error("Non-JSON response:", text);
        throw new Error("Server returned invalid response.");
      }

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to create course.");
        return;
      }

      setLoading(false);
      router.push("/instructor/courses");
    } catch (err) {
      console.error("Create course submit error:", err);
      setLoading(false);
      setError("Something went wrong while creating the course.");
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Create Course</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        <input
          className="w-full rounded border p-3"
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full rounded border p-3"
          placeholder="Course description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white"
        >
          {loading ? "Creating..." : "Create Course"}
        </button>
      </form>
    </main>
  );
}