"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ApiErrorResponse = {
  error?: string;
};

export default function AddMaterialPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("link");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          title,
          fileUrl,
          fileType,
        }),
      });

      const text = await res.text();
      let data: ApiErrorResponse = {};

      try {
        data = text ? (JSON.parse(text) as ApiErrorResponse) : {};
      } catch {
        throw new Error("Server returned invalid response.");
      }

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to add material.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}`);
    } catch (err) {
      console.error("Add material error:", err);
      setLoading(false);
      setError("Something went wrong while adding material.");
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Add Material</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        <input
          className="w-full rounded border p-3"
          placeholder="Material title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full rounded border p-3"
          placeholder="Material URL"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
        />

        <select
          className="w-full rounded border p-3"
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
        >
          <option value="link">Link</option>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
          <option value="doc">Document</option>
        </select>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white"
        >
          {loading ? "Adding..." : "Add Material"}
        </button>
      </form>
    </main>
  );
}