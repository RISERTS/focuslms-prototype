"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EnrollmentRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REMOVED";
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
  enrollments: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REMOVED";
  }[];
};

type Props = {
  courseId: string;
  courseTitle: string;
  approved: EnrollmentRow[];
  pending: EnrollmentRow[];
  availableStudents: AvailableStudent[];
};

type ApiResponse = {
  error?: string;
  message?: string;
};

export default function StudentRosterManager({
  courseId,
  approved,
  pending,
  availableStudents,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [busyEnrollmentId, setBusyEnrollmentId] = useState<string | null>(null);
  const [busyStudentEmail, setBusyStudentEmail] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<EnrollmentRow | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function enrollByEmail(studentEmail: string) {
    if (!studentEmail.trim()) return;

    setError("");
    setMessage("");
    setLoadingEmail(true);
    setBusyStudentEmail(studentEmail);

    try {
      const res = await fetch(`/api/courses/${courseId}/direct-enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: studentEmail,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setLoadingEmail(false);
        setBusyStudentEmail(null);
        setError(data.error || "Failed to enroll student.");
        return;
      }

      setLoadingEmail(false);
      setBusyStudentEmail(null);
      setEmail("");
      setMessage(data.message || "Student enrolled successfully.");
      router.refresh();
    } catch (err) {
      console.error("Enroll by email UI error:", err);
      setLoadingEmail(false);
      setBusyStudentEmail(null);
      setError("Something went wrong while enrolling the student.");
    }
  }

  async function updateEnrollment(
    enrollmentId: string,
    action: "APPROVE" | "REJECT" | "REMOVE"
  ) {
    setError("");
    setMessage("");
    setBusyEnrollmentId(enrollmentId);

    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as ApiResponse) : {};

      if (!res.ok) {
        setBusyEnrollmentId(null);
        setError(data.error || "Failed to update enrollment.");
        return;
      }

      setBusyEnrollmentId(null);
      setConfirmRemove(null);
      setMessage("Enrollment updated successfully.");
      router.refresh();
    } catch (err) {
      console.error("Update enrollment UI error:", err);
      setBusyEnrollmentId(null);
      setError("Something went wrong while updating the enrollment.");
    }
  }

  return (
    <>
      <div className="space-y-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Direct Enroll by Email</h2>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@email.com"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
            <button
              onClick={() => void enrollByEmail(email)}
              disabled={loadingEmail || !email.trim()}
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
            >
              {loadingEmail && busyStudentEmail === email
                ? "Enrolling..."
                : "Enroll Student"}
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Pending Requests</h2>

          <div className="mt-6 space-y-4">
            {pending.length === 0 ? (
              <p className="text-sm text-gray-600">No pending requests.</p>
            ) : (
              pending.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-semibold">{enrollment.user.name}</p>
                    <p className="text-sm text-gray-600">{enrollment.user.email}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Requested: {new Date(enrollment.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void updateEnrollment(enrollment.id, "APPROVE")}
                      disabled={busyEnrollmentId === enrollment.id}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
                    >
                      {busyEnrollmentId === enrollment.id ? "Working..." : "Approve"}
                    </button>
                    <button
                      onClick={() => void updateEnrollment(enrollment.id, "REJECT")}
                      disabled={busyEnrollmentId === enrollment.id}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-70"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Approved Students</h2>

          <div className="mt-6 space-y-4">
            {approved.length === 0 ? (
              <p className="text-sm text-gray-600">No approved students yet.</p>
            ) : (
              approved.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-semibold">{enrollment.user.name}</p>
                    <p className="text-sm text-gray-600">{enrollment.user.email}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Approved record: {new Date(enrollment.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => setConfirmRemove(enrollment)}
                    className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Remove Student
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Available Student List</h2>

          <div className="mt-6 space-y-4">
            {availableStudents.length === 0 ? (
              <p className="text-sm text-gray-600">No available students found.</p>
            ) : (
              availableStudents.map((student) => {
                const existingStatus = student.enrollments[0]?.status ?? null;

                return (
                  <div
                    key={student.id}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.email}</p>
                      {existingStatus && (
                        <p className="mt-1 text-xs text-gray-500">
                          Current course status: {existingStatus}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => void enrollByEmail(student.email)}
                      disabled={busyStudentEmail === student.email}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
                    >
                      {busyStudentEmail === student.email ? "Enrolling..." : "Enroll"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Remove Student</h3>
            <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-gray-900">
                {confirmRemove.user.name}
              </span>{" "}
              from this course?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void updateEnrollment(confirmRemove.id, "REMOVE")}
                disabled={busyEnrollmentId === confirmRemove.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
              >
                {busyEnrollmentId === confirmRemove.id
                  ? "Removing..."
                  : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}