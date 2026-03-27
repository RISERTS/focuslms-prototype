"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteMaterialButton({
  materialId,
}: {
  materialId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: "DELETE",
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as { error?: string }) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to delete material.");
        return;
      }

      setLoading(false);
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Delete material UI error:", err);
      setLoading(false);
      setError("Something went wrong while deleting the material.");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Delete Material</h3>
            <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to delete this material? This action cannot
              be undone.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={loading}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
              >
                {loading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}