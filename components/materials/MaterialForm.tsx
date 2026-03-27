"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TermCategory = "PRELIMS" | "MIDTERMS" | "FINALS";
type MaterialType = "TEXT" | "LINK" | "FILE";

type Props = {
  mode: "create" | "edit";
  courseId: string;
  materialId?: string;
  initialData?: {
    title: string;
    materialType: MaterialType;
    contentText: string;
    linkUrl: string;
    term: TermCategory;
    currentFileName: string;
    currentFileUrl: string;
  };
};

type ApiResponse = {
  error?: string;
};

export default function MaterialForm({
  mode,
  courseId,
  materialId,
  initialData,
}: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [materialType, setMaterialType] = useState<MaterialType>(
    initialData?.materialType ?? "LINK"
  );
  const [contentText, setContentText] = useState(initialData?.contentText ?? "");
  const [linkUrl, setLinkUrl] = useState(initialData?.linkUrl ?? "");
  const [term, setTerm] = useState<TermCategory>(initialData?.term ?? "PRELIMS");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      if (mode === "create") {
        formData.append("courseId", courseId);
      }

      formData.append("title", title);
      formData.append("materialType", materialType);
      formData.append("term", term);
      formData.append("contentText", contentText);
      formData.append("linkUrl", linkUrl);

      if (file) {
        formData.append("file", file);
      }

      const endpoint =
        mode === "create"
          ? "/api/materials"
          : `/api/materials/${materialId}`;

      const res = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        body: formData,
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to save material.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}`);
      router.refresh();
    } catch (err) {
      console.error("Material form error:", err);
      setLoading(false);
      setError("Something went wrong while saving the material.");
    }
  }

  return (
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
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              >
                <option value="TEXT">Text</option>
                <option value="LINK">Link</option>
                <option value="FILE">File Upload</option>
              </select>
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

          {materialType === "TEXT" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Text Content
              </label>
              <textarea
                rows={12}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              />
            </div>
          )}

          {materialType === "LINK" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Resource Link
              </label>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              />
            </div>
          )}

          {materialType === "FILE" && (
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Upload File
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mp3"
                />
              </div>

              {mode === "edit" && initialData?.currentFileUrl && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">Current File</p>
                  <p className="mt-1">{initialData.currentFileName || "Existing file"}</p>
                  <a
                    href={initialData.currentFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block underline"
                  >
                    Open Current File
                  </a>
                </div>
              )}
            </div>
          )}

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
            {loading
              ? mode === "create"
                ? "Saving..."
                : "Updating..."
              : mode === "create"
              ? "Add Material"
              : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
          Notes
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Text Material</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Best for lessons, instructions, and long-form written content.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Link Material</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Use this for Google Docs, videos, websites, and external references.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">File Upload</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Supports uploads like images, PDF, Word, PowerPoint, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}