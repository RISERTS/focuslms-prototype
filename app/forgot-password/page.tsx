"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RequestResponse = {
  error?: string;
  message?: string;
  resendAvailableAt?: string;
};

type ResetResponse = {
  error?: string;
  message?: string;
};

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [requestLoading, setRequestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const secondsLeft = useMemo(() => {
    if (!resendAvailableAt) return 0;
    const diff = Math.ceil(
      (new Date(resendAvailableAt).getTime() - nowMs) / 1000
    );
    return diff > 0 ? diff : 0;
  }, [resendAvailableAt, nowMs]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setRequestLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as RequestResponse) : {};

      if (!res.ok) {
        setRequestLoading(false);
        setError(data.error || "Failed to request OTP.");
        return;
      }

      setRequestLoading(false);
      setOtpSent(true);
      setMessage(
        data.message ||
          "If an account exists for that email, an OTP has been sent."
      );
      setResendAvailableAt(data.resendAvailableAt || null);
    } catch (err) {
      console.error("Forgot password request UI error:", err);
      setRequestLoading(false);
      setError("Something went wrong while requesting the OTP.");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
          confirmPassword,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ResetResponse) : {};

      if (!res.ok) {
        setResetLoading(false);
        setError(data.error || "Failed to reset password.");
        return;
      }

      setResetLoading(false);
      setMessage(
        data.message || "Password changed successfully. You can now log in."
      );

      window.setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error("Forgot password reset UI error:", err);
      setResetLoading(false);
      setError("Something went wrong while resetting the password.");
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 text-gray-900">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
              FocusLMS
            </p>

            <h1 className="mt-4 text-3xl font-bold">Forgot Password</h1>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Enter your email address to receive a one-time password. The OTP
              expires after 15 minutes. Requesting a new OTP automatically
              invalidates the previous one.
            </p>

            <form onSubmit={handleRequestOtp} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={requestLoading || !email.trim() || secondsLeft > 0}
                className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
              >
                {requestLoading
                  ? "Sending OTP..."
                  : otpSent
                  ? secondsLeft > 0
                    ? `Resend available in ${secondsLeft}s`
                    : "Send New OTP"
                  : "Send OTP"}
              </button>
            </form>

            <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  OTP Code
                </label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm tracking-[0.4em] text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  placeholder="123456"
                  maxLength={6}
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                disabled={
                  resetLoading ||
                  !email.trim() ||
                  otp.length !== 6 ||
                  !newPassword ||
                  !confirmPassword
                }
                className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
              >
                {resetLoading ? "Changing Password..." : "Change Password"}
              </button>
            </form>

            <div className="mt-6">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 underline transition hover:text-black"
              >
                Back to Login
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
              Security
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold">OTP Expiry</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Each code expires in 15 minutes.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold">Single Active OTP</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Requesting a new code invalidates all older unused codes.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold">Resend Cooldown</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  A new OTP can only be requested every 2 minutes.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold">Wrong Attempt Protection</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Too many incorrect OTP attempts will force the user to request
                  a new code.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}