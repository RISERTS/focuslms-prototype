"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type EnrollmentRow = {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type AvailableStudent = {
  id: string;
  name: string;
  email: string;
};

type Props = {
  courseId: string;
  courseTitle: string;
  approved: EnrollmentRow[];
  pending: EnrollmentRow[];
  available: AvailableStudent[];
};

type ApiResponse = {
  error?: string;
  message?: string;
  enrolledCount?: number;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function StudentRosterManager({
  courseId,
  courseTitle,
  approved,
  pending,
  available,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [email, setEmail] = useState("");

  const [bulkLoading, setBulkLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [approvalLoadingId, setApprovalLoadingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const keyword = useMemo(() => normalizeText(search), [search]);

  const filteredAvailable = useMemo(() => {
    if (!keyword) return available;

    return available.filter((student) => {
      const name = normalizeText(student.name);
      const emailValue = normalizeText(student.email);
      return name.includes(keyword) || emailValue.includes(keyword);
    });
  }, [available, keyword]);

  const filteredApproved = useMemo(() => {
    if (!keyword) return approved;

    return approved.filter((row) => {
      const name = normalizeText(row.user.name);
      const emailValue = normalizeText(row.user.email);
      return name.includes(keyword) || emailValue.includes(keyword);
    });
  }, [approved, keyword]);

  const filteredPending = useMemo(() => {
    if (!keyword) return pending;

    return pending.filter((row) => {
      const name = normalizeText(row.user.name);
      const emailValue = normalizeText(row.user.email);
      return name.includes(keyword) || emailValue.includes(keyword);
    });
  }, [pending, keyword]);

  const allVisibleSelected =
    filteredAvailable.length > 0 &&
    filteredAvailable.every((student) => selectedIds.includes(student.id));

  function toggleStudent(studentId: string) {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !filteredAvailable.some((student) => student.id === id))
      );
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredAvailable.forEach((student) => next.add(student.id));
      return [...next];
    });
  }

  async function enrollStudentIds(studentIds: string[]) {
    if (studentIds.length === 0) {
      setError("Please select at least one student to enroll.");
      setMessage("");
      return;
    }

    setBulkLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/courses/${courseId}/bulk-enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentIds,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setBulkLoading(false);
        setError(data.error || "Failed to enroll selected students.");
        return;
      }

      setBulkLoading(false);
      setSelectedIds([]);
      setMessage(data.message || "Selected students enrolled successfully.");
      router.refresh();
    } catch (err) {
      console.error("Bulk enroll UI error:", err);
      setBulkLoading(false);
      setError("Something went wrong while enrolling selected students.");
    }
  }

  async function handleBulkEnroll() {
    await enrollStudentIds(selectedIds);
  }

  async function handleSingleEnroll(studentId: string) {
    await enrollStudentIds([studentId]);
  }

  async function handleEnrollByEmail(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter a student email.");
      setMessage("");
      return;
    }

    setEmailLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll-by-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setEmailLoading(false);
        setError(data.error || "Failed to enroll by email.");
        return;
      }

      setEmailLoading(false);
      setEmail("");
      setMessage(data.message || "Student enrolled successfully.");
      router.refresh();
    } catch (err) {
      console.error("Enroll by email UI error:", err);
      setEmailLoading(false);
      setError("Something went wrong while enrolling by email.");
    }
  }

  async function handleApprove(enrollmentId: string) {
    setApprovalLoadingId(enrollmentId);
    setError("");
    setMessage("");

    try {
      const res = await fetch(
        `/api/courses/${courseId}/enrollments/${enrollmentId}/approve`,
        {
          method: "POST",
        }
      );

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setApprovalLoadingId(null);
        setError(data.error || "Failed to approve request.");
        return;
      }

      setApprovalLoadingId(null);
      setMessage(data.message || "Enrollment request approved.");
      router.refresh();
    } catch (err) {
      console.error("Approve enrollment UI error:", err);
      setApprovalLoadingId(null);
      setError("Something went wrong while approving the request.");
    }
  }

  async function handleReject(enrollmentId: string) {
    setApprovalLoadingId(enrollmentId);
    setError("");
    setMessage("");

    try {
      const res = await fetch(
        `/api/courses/${courseId}/enrollments/${enrollmentId}/reject`,
        {
          method: "POST",
        }
      );

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setApprovalLoadingId(null);
        setError(data.error || "Failed to reject request.");
        return;
      }

      setApprovalLoadingId(null);
      setMessage(data.message || "Enrollment request rejected.");
      router.refresh();
    } catch (err) {
      console.error("Reject enrollment UI error:", err);
      setApprovalLoadingId(null);
      setError("Something went wrong while rejecting the request.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Course
          </p>
          <h2 className="mt-3 text-3xl font-bold text-gray-900">{courseTitle}</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                Approved
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {approved.length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                Pending
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {pending.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            Enroll by Email
          </p>

          <form onSubmit={handleEnrollByEmail} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Student Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                placeholder="student@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:opacity-70"
            >
              {emailLoading ? "Enrolling..." : "Enroll by Email"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
          Search Students
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name or email"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
        />
        <p className="mt-3 text-sm text-gray-600">
          This search filters the available list, approved students, and pending requests.
        </p>
      </div>

      {(error || message) && (
        <div
          className={
            error
              ? "rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
              : "rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700"
          }
        >
          {error || message}
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Available Students
            </p>
            <h3 className="mt-2 text-2xl font-bold text-gray-900">
              Search and Bulk Enroll
            </h3>
          </div>

          <button
            type="button"
            onClick={() => void handleBulkEnroll()}
            disabled={bulkLoading || selectedIds.length === 0}
            className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {bulkLoading
              ? "Enrolling..."
              : `Enroll Selected (${selectedIds.length})`}
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
            />
            <span className="text-sm font-medium text-gray-700">
              Select all visible students
            </span>
          </label>
        </div>

        <div className="mt-6 grid gap-3">
          {filteredAvailable.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
              No available students match your search.
            </div>
          ) : (
            filteredAvailable.map((student) => {
              const checked = selectedIds.includes(student.id);

              return (
                <div
                  key={student.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <label className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(student.id)}
                      />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {student.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {student.email}
                        </p>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => void handleSingleEnroll(student.id)}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Enroll
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                Approved Students
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900">
                Current Enrollees
              </h3>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
              {filteredApproved.length}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {filteredApproved.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                No approved students match your search.
              </div>
            ) : (
              filteredApproved.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="font-semibold text-gray-900">{row.user.name}</p>
                  <p className="mt-1 text-sm text-gray-600">{row.user.email}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                Pending Requests
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900">
                Waiting for Approval
              </h3>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
              {filteredPending.length}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {filteredPending.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                No pending requests match your search.
              </div>
            ) : (
              filteredPending.map((row) => {
                const loading = approvalLoadingId === row.id;

                return (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {row.user.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {row.user.email}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleApprove(row.id)}
                          disabled={loading}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          {loading ? "Processing..." : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleReject(row.id)}
                          disabled={loading}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          {loading ? "Processing..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}