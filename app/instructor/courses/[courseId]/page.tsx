import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";

export default async function InstructorCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      materials: {
        orderBy: {
          uploadedAt: "desc",
        },
      },
      quizzes: {
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          materials: true,
          quizzes: true,
          enrollments: true,
        },
      },
    },
  });

  if (!course) {
    return (
      <InstructorShell
        title="Course Not Found"
        description="The requested course could not be found."
        actions={[
          {
            label: "Back to Courses",
            href: "/instructor/courses",
            variant: "secondary",
          },
        ]}
      >
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold">This course does not exist.</p>
        </div>
      </InstructorShell>
    );
  }

  if (course.instructorId !== session.userId) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title={course.title}
      description={course.description || "No description"}
      actions={[
        {
          label: "Add Material",
          href: `/instructor/courses/${course.id}/add-material`,
          variant: "secondary",
        },
        {
          label: "Manage Quizzes",
          href: `/instructor/courses/${course.id}/quizzes`,
          variant: "primary",
        },
        {
          label: "Analytics",
          href: `/instructor/courses/${course.id}/analytics`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Materials
          </p>
          <p className="mt-3 text-3xl font-bold">{course._count.materials}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Quizzes
          </p>
          <p className="mt-3 text-3xl font-bold">{course._count.quizzes}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Enrollments
          </p>
          <p className="mt-3 text-3xl font-bold">{course._count.enrollments}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Materials</h2>
            <Link
              href={`/instructor/courses/${course.id}/add-material`}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Add
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {course.materials.length === 0 ? (
              <p className="text-sm text-gray-600">No materials added yet.</p>
            ) : (
              course.materials.map((material) => (
                <div
                  key={material.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="font-semibold">{material.title}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Type: {material.fileType}
                  </p>
                  <a
                    href={material.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-medium underline"
                  >
                    Open Material
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Quizzes</h2>
            <Link
              href={`/instructor/courses/${course.id}/quizzes`}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Open
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {course.quizzes.length === 0 ? (
              <p className="text-sm text-gray-600">No quizzes created yet.</p>
            ) : (
              course.quizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/instructor/courses/${course.id}/quizzes/${quiz.id}`}
                  className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-white"
                >
                  <p className="font-semibold">{quiz.title}</p>
                  <p className="mt-2 text-sm text-gray-600">
                    {quiz.description || "No description"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}