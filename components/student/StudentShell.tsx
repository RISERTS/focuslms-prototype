"use client";

import Link from "next/link";
import ConfirmLogoutButton from "@/components/ConfirmLogoutButton";

type Action = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

type Props = {
  title: string;
  description?: string;
  eyebrow?: string;
  sessionEmail?: string;
  actions?: Action[];
  children: React.ReactNode;
};

export default function StudentShell({
  title,
  description,
  eyebrow = "Student Workspace",
  sessionEmail,
  actions = [],
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 text-gray-900">
      <section className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
                FocusLMS
              </p>
              {sessionEmail && (
                <p className="mt-1 text-sm text-gray-500">{sessionEmail}</p>
              )}
            </div>

            <nav className="flex flex-wrap gap-2">
              <Link
                href="/student/dashboard"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Dashboard
              </Link>
              <Link
                href="/student/enrolled"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                My Courses
              </Link>
              <Link
                href="/student/courses"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Browse Courses
              </Link>
              <Link
                href="/student/grades"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Grades
              </Link>
              <Link
                href="/profile"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Profile
              </Link>
            </nav>
          </div>

          <ConfirmLogoutButton />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-tight">{title}</h1>
              {description && (
                <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
                  {description}
                </p>
              )}
            </div>

            {actions.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {actions.map((action) => (
                  <Link
                    key={`${action.href}-${action.label}`}
                    href={action.href}
                    className={
                      action.variant === "secondary"
                        ? "rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        : "rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                    }
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}