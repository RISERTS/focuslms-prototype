"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  error?: string;
  role?: "STUDENT" | "INSTRUCTOR";
};

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as LoginResponse) : {};

      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      if (data.role === "INSTRUCTOR") {
        router.push("/instructor/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoading(false);
      setError("Something went wrong while logging in.");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl lg:grid-cols-2">
          <section className="hidden bg-black px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-gray-300">
                FocusLMS
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-tight">
                Welcome back to your learning space
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-gray-300">
                Access courses, quizzes, adaptive assessments, analytics, and
                learning materials in one focused environment.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">For students</p>
                <p className="mt-1 text-sm text-gray-300">
                  Continue lessons, open materials, and take quizzes.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">For instructors</p>
                <p className="mt-1 text-sm text-gray-300">
                  Manage courses, generate questions, and monitor analytics.
                </p>
              </div>
            </div>
          </section>

          <section className="px-6 py-10 sm:px-10 lg:px-12">
            <div className="mx-auto max-w-md">
              <div className="lg:hidden">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                  FocusLMS
                </p>
              </div>

              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                Sign in
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Enter your account credentials to continue.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-24 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
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
                  className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/register"
                  className="rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Create account
                </Link>

                <Link
                  href="/"
                  className="rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Back to home
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}