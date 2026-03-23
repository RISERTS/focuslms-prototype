"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import InstructorShell from "@/components/instructor/InstructorShell";

type TermCategory = "PRELIMS" | "MIDTERMS" | "FINALS";

type ApiResponse = {
  error?: string;
  id?: string;
};

export default function AddMaterialPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [term, setTerm] = useState<TermCategory>("PRELIMS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const normalizedFileType = fileType.trim()
        ? fileType.trim()
        : "LINK";

      const normalizedFileKey = fileUrl.trim();

      const res = await fetch("/api/materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          title,
          fileKey: normalizedFileKey,
          fileUrl,
          fileType: normalizedFileType,
          term,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to add material.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}`);
      router.refresh();
    } catch (err) {
      console.error("Add material error:", err);
      setLoading(false);
      setError("Something went wrong while adding the material.");
    }
  }

  return (
    <InstructorShell
      title="Add Material"
      description="Add a learning resource to this course and assign it to a term."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Material Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="Example: Chapter 1 Discussion Slides"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                File URL / Link
              </label>
              <input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  File Type
                </label>
                <input
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="PDF, PPTX, DOCX, VIDEO, LINK"
                />
              </div>

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
              {loading ? "Saving..." : "Add Material"}
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
                Assign each material to Prelims, Midterms, or Finals so course
                resources are organized by term.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">File URL</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                This version stores a direct file link or resource link as the
                material URL.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">File Type</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                You can label the resource as PDF, PPTX, DOCX, VIDEO, LINK, or
                any type you want to use in your UI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}