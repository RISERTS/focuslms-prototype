"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialName: string;
  email: string;
  role: string;
};

type ApiResponse = {
  error?: string;
  message?: string;
};

export default function ProfileForm({ initialName, email, role }: Props) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Failed to update profile.");
        return;
      }

      setLoading(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setMessage(data.message || "Profile updated successfully.");
      router.refresh();
    } catch (err) {
      console.error("Profile form error:", err);
      setLoading(false);
      setError("Something went wrong while updating your profile.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Current Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              value={email}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Role
            </label>
            <input
              value={role}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500 outline-none"
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-lg font-bold">Change Password</h2>
            <p className="mt-1 text-sm text-gray-600">
              Leave the password fields blank if you only want to change your name.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>

          {message && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
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
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
          Profile Settings
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Name Update</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Your current name is already loaded into the field so you can edit it directly.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Password Change</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              To change your password, enter your current password, then your new one.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold">Security</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Strong passwords are recommended before deployment to production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}