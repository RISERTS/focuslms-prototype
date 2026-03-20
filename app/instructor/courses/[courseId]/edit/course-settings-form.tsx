"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  courseId: string;
  initialData: {
    courseCode: string;
    title: string;
    program: string;
    section: string;
    description: string;
  };
};

type ApiResponse = {
  error?: string;
};

export default function EditCourseSettingsForm({
  courseId,
  initialData,
}: Props) {
  const router = useRouter();

  const [courseCode, setCourseCode] = useState(initialData.courseCode);
  const [title, setTitle] = useState(initialData.title);
  const [program, setProgram] = useState(initialData.program);
  const [section, setSection] = useState(initialData.section);
  const [description, setDescription] = useState(initialData.description);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseCode,
          title,
          program,
          section,
          description,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to update course settings.");
        return;
      }

      setLoading(false);
      router.push(`/instructor/courses/${courseId}`);
      router.refresh();
    } catch (err) {
      console.error("Edit course settings error:", err);
      setLoading(false);
      setError("Something went wrong while updating the course.");
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Course Name / Code
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g. CPE 321"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Course Title
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Embedded Systems"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Program
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g. BSCPE, BSIT, BSCS"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Section
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. BSCPE-3A"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Course Description
          </label>
          <textarea
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            rows={7}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the course"
          />
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
  );
}