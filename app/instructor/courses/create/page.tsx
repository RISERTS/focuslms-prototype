"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InstructorShell from "@/components/instructor/InstructorShell";

type ApiErrorResponse = {
  error?: string;
};

export default function CreateCoursePage() {
  const router = useRouter();

  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [program, setProgram] = useState("");
  const [section, setSection] = useState("");
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
        body: JSON.stringify({
          courseCode,
          title,
          description,
          program,
          section,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiErrorResponse) : {};

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
    <InstructorShell
      title="Create Course"
      description="Set up a new course space with code, title, program, section, and description."
      actions={[
        {
          label: "Back to Courses",
          href: "/instructor/courses",
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Course Name / Code
                </label>
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="e.g. CPE 321"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Course Title
                </label>
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="e.g. Embedded Systems"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  placeholder="e.g. BSCPE, BSIT, BSCS"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Section
                </label>
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="e.g. BSCPE-3A"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Course Description
              </label>
              <textarea
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                placeholder="Describe the course content and purpose"
                rows={7}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              {loading ? "Creating..." : "Create Course"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            Course Setup Tips
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Use a clear code and title</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Example: CPE 321 — Embedded Systems.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Match the correct group</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Set the intended program and section for cleaner organization.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">You can edit this later</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                The course settings page lets you update these fields later.
              </p>
            </div>
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}