"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type RegisterResponse = {
  error?: string;
};

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as RegisterResponse) : {};

      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      router.push("/login");
    } catch (err) {
      console.error("Register error:", err);
      setLoading(false);
      setError("Something went wrong while creating your account.");
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-2xl">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-t-3xl bg-black px-8 py-10 text-white lg:rounded-l-3xl lg:rounded-tr-none">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-300">
                FocusLMS
              </p>

              <h1 className="mt-5 text-3xl font-bold leading-tight">
                Create your account
              </h1>

              <p className="mt-4 text-sm leading-7 text-gray-300">
                Register as a student or instructor and start using the learning
                platform with courses, materials, quizzes, adaptive assessment,
                and analytics.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold">Student access</p>
                  <p className="mt-1 text-sm text-gray-300">
                    Join courses, open materials, and answer quizzes.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold">Instructor access</p>
                  <p className="mt-1 text-sm text-gray-300">
                    Create courses, manage quizzes, review essays, and monitor
                    analytics.
                  </p>
                </div>
              </div>
            </section>

            <section className="px-6 py-10 sm:px-8 lg:px-10">
              <div className="mx-auto max-w-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Register
                </p>

                <h2 className="mt-3 text-3xl font-bold text-gray-900">
                  Set up your account
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Fill in your details to continue to FocusLMS.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Full name
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      required
                    />
                  </div>

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
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Role
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, role: "STUDENT" })}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                          form.role === "STUDENT"
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Student
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, role: "INSTRUCTOR" })}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                          form.role === "INSTRUCTOR"
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Instructor
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
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

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Confirm password
                    </label>

                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={form.confirmPassword}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-24 text-sm text-gray-900 placeholder:text-gray-400 caret-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((prev) => !prev)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
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
                    {loading ? "Creating account..." : "Create account"}
                  </button>
                </form>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/login"
                    className="rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Already have an account?
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
      </div>
    </main>
  );
}