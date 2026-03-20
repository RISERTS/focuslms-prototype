"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";

export default function ConfirmLogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/logout", {
        method: "POST",
      });

      if (!res.ok) {
        setLoading(false);
        setError("Failed to logout.");
        return;
      }

      setLoading(false);
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setLoading(false);
      setError("Something went wrong while logging out.");
    }
  }

  const canUsePortal = typeof window !== "undefined";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
      >
        Logout
      </button>

      {open && canUsePortal &&
    createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">
            Confirm Logout
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
            Are you sure you want to logout from FocusLMS?
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
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
                Cancel
            </button>

            <button
                onClick={handleLogout}
                disabled={loading}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
                {loading ? "Logging out..." : "Yes, Logout"}
            </button>
            </div>
        </div>
        </div>,
        document.body
        )}
    </>
  );
}