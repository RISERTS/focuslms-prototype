import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";
import RequestEnrollmentButton from "@/components/student/RequestEnrollmentButton";

export default async function StudentCoursesPage() {
  const session = await getSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      include: {
        _count: {
          select: {
            materials: true,
            quizzes: true,
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.enrollment.findMany({
      where: {
        userId: session.userId,
      },
      select: {
        courseId: true,
        status: true,
      },
    }),
  ]);

  const enrollmentMap = new Map(
    enrollments.map((e) => [e.courseId, e.status])
  );

  return (
    <StudentShell
      title="Browse Courses"
      description="Explore available courses and request enrollment for classes you want to join."
      sessionEmail={session.email}
      actions={[
        {
          label: "My Enrolled Courses",
          href: "/student/enrolled",
          variant: "secondary",
        },
      ]}
    >
      {courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold">No courses available yet</h2>
          <p className="mt-3 text-sm text-gray-600">
            Check back later once instructors publish courses.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const status = enrollmentMap.get(course.id);

            return (
              <div
                key={course.id}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{course.title}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {course.description || "No description"}
                    </p>
                  </div>

                  <span
                    className={
                      status === "APPROVED"
                        ? "rounded-full bg-black px-3 py-1 text-xs font-semibold text-white"
                        : status === "PENDING"
                        ? "rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700"
                        : status === "REJECTED"
                        ? "rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                        : status === "REMOVED"
                        ? "rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                        : "rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700"
                    }
                  >
                    {status === "APPROVED"
                      ? "Enrolled"
                      : status === "PENDING"
                      ? "Pending"
                      : status === "REJECTED"
                      ? "Rejected"
                      : status === "REMOVED"
                      ? "Removed"
                      : "Available"}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                      Materials
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {course._count.materials}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                      Quizzes
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {course._count.quizzes}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                      Students
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {course._count.enrollments}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  {status === "APPROVED" ? (
                    <Link
                      href={`/student/courses/${course.id}`}
                      className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                      Open Course
                    </Link>
                  ) : status === "PENDING" ? (
                    <span className="inline-flex rounded-xl border border-yellow-300 bg-yellow-50 px-5 py-3 text-sm font-semibold text-yellow-700">
                      Pending Approval
                    </span>
                  ) : (
                    <RequestEnrollmentButton courseId={course.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}