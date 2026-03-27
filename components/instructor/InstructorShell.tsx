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

function navButtonClass(href: string) {
  if (href === "/instructor/dashboard") {
    return "rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100";
  }

  if (href === "/instructor/courses") {
    return "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100";
  }

  if (href === "/instructor/courses/create") {
    return "rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100";
  }

  if (href === "/profile") {
    return "rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100";
  }

  return "rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50";
}

function actionButtonClass(action: Action) {
  const key = `${action.label} ${action.href}`.toLowerCase();

  if (key.includes("back")) {
    return "rounded-xl border border-gray-300 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100";
  }

  if (key.includes("grade")) {
    return "rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100";
  }

  if (key.includes("analytic")) {
    return "rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100";
  }

  if (key.includes("edit")) {
    return "rounded-xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100";
  }

  if (key.includes("student")) {
    return "rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100";
  }

  if (key.includes("material")) {
    return "rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100";
  }

  if (key.includes("quiz")) {
    return "rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100";
  }

  if (key.includes("generate")) {
    return "rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-5 py-3 text-sm font-semibold text-fuchsia-700 transition hover:bg-fuchsia-100";
  }

  if (key.includes("review")) {
    return "rounded-xl border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100";
  }

  if (key.includes("danger") || key.includes("delete") || key.includes("remove")) {
    return "rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100";
  }

  return action.variant === "secondary"
    ? "rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
    : "rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800";
}

export default function InstructorShell({
  title,
  description,
  eyebrow = "Instructor Workspace",
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
                href="/instructor/dashboard"
                className={navButtonClass("/instructor/dashboard")}
              >
                Dashboard
              </Link>

              <Link
                href="/instructor/courses"
                className={navButtonClass("/instructor/courses")}
              >
                My Courses
              </Link>

              <Link
                href="/instructor/courses/create"
                className={navButtonClass("/instructor/courses/create")}
              >
                Create Course
              </Link>

              <Link href="/profile" className={navButtonClass("/profile")}>
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
                    className={actionButtonClass(action)}
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