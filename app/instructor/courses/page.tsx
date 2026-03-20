import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";

export default async function InstructorCoursesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  const courses = await prisma.course.findMany({
    where: {
      instructorId: session.userId,
    },
    include: {
      _count: {
        select: {
          quizzes: true,
          materials: true,
          enrollments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <InstructorShell
      title="My Courses"
      description="Open your active courses, manage their content, and track their progress."
      sessionEmail={session.email}
      actions={[
        {
          label: "Create Course",
          href: "/instructor/courses/create",
          variant: "primary",
        },
      ]}
    >
      {courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold">No courses created yet</h2>
          <p className="mt-3 text-sm text-gray-600">
            Start by creating your first course and add materials and quizzes.
          </p>
          <Link
            href="/instructor/courses/create"
            className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Create Course
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/instructor/courses/${course.id}`}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{course.title}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {course.description || "No description"}
                  </p>
                </div>
                <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                  Course
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
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
                    Materials
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {course._count.materials}
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
            </Link>
          ))}
        </div>
      )}
    </InstructorShell>
  );
}