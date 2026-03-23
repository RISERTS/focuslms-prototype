import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";

export default async function StudentEnrolledCoursesPage() {
  const session = await getSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.userId,
      status: "APPROVED",
    },
    include: {
      course: {
        include: {
          _count: {
            select: {
              materials: true,
              quizzes: true,
              enrollments: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <StudentShell
      title="My Enrolled Courses"
      description="Open the classes you are approved to join."
      sessionEmail={session.email}
      actions={[
        {
          label: "Browse Courses",
          href: "/student/courses",
          variant: "secondary",
        },
      ]}
    >
      {enrollments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold">No approved courses yet</h2>
          <p className="mt-3 text-sm text-gray-600">
            Browse available courses and request enrollment.
          </p>
          <Link
            href="/student/courses"
            className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {enrollments.map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/student/courses/${enrollment.course.id}`}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">
                    {enrollment.course.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {enrollment.course.description || "No description"}
                  </p>
                </div>

                <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                  Approved
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                    Materials
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {enrollment.course._count.materials}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                    Quizzes
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {enrollment.course._count.quizzes}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                    Students
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {enrollment.course._count.enrollments}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </StudentShell>
  );
}