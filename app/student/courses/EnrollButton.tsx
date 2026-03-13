"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEnroll() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Enrollment failed.");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-white"
      >
        {loading ? "Enrolling..." : "Enroll"}
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}