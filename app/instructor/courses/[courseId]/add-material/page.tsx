"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import InstructorShell from "@/components/instructor/InstructorShell";

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
      const data = text ? (JSON.parse(text) as ApiErrorResponse) : {};

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
    <InstructorShell
      title="Add Material"
      description="Attach a new learning resource to this course."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Material title
              </label>
              <input
                id="title"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="Enter material title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="fileUrl"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Material URL
              </label>
              <input
                id="fileUrl"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="https://example.com/resource"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="fileType"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Material type
              </label>
              <select
                id="fileType"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
              >
                <option value="link">Link</option>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="doc">Document</option>
              </select>
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
              {loading ? "Adding..." : "Add Material"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            Material Notes
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Title clearly</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Use a specific title such as “Week 1 Slides” or “Laboratory
                Guide”.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Use accessible links</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Make sure the link can be opened by your students.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Organize by type</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Label the resource properly so students know what to expect.
              </p>
            </div>
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}