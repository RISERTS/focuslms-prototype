"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  courseId: string;
  courseTitle: string;
};

type ApiResponse = {
  error?: string;
};

export default function DeleteCourseForm({ courseId, courseTitle }: Props) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requiredPhrase = `DELETE ${courseTitle}`;

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to delete course.");
        return;
      }

      setLoading(false);
      router.push("/instructor/courses");
      router.refresh();
    } catch (err) {
      console.error("Delete course form error:", err);
      setLoading(false);
      setError("Something went wrong while deleting the course.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleDelete} className="space-y-5">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            This action is permanent and cannot be undone.
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type this exactly to confirm
            </label>
            <div className="mb-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
              {requiredPhrase}
            </div>
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || confirmation !== requiredPhrase}
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
          >
            {loading ? "Deleting..." : "Delete Course"}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
          What Gets Deleted
        </p>

        <div className="mt-6 space-y-3 text-sm text-gray-300">
          <p>• course record</p>
          <p>• quizzes and questions</p>
          <p>• quiz attempts and answers</p>
          <p>• materials</p>
          <p>• enrollments</p>
          <p>• related activity logs</p>
        </div>
      </div>
    </div>
  );
}