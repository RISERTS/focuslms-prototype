"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ApiResponse = {
  error?: string;
  message?: string;
};

export default function RequestEnrollmentButton({
  courseId,
}: {
  courseId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestEnrollment() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/enrollments/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to request enrollment.");
        return;
      }

      setLoading(false);
      router.refresh();
    } catch (err) {
      console.error("Request enrollment button error:", err);
      setLoading(false);
      setError("Something went wrong while requesting enrollment.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={requestEnrollment}
        disabled={loading}
        className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-70"
      >
        {loading ? "Requesting..." : "Request Enrollment"}
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}