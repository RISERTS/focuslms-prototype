import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import DeleteMaterialButton from "@/components/materials/DeleteMaterialButton";

function formatSchedule(date: Date | null) {
  return date ? date.toLocaleString() : null;
}

function termLabel(term: string) {
  if (term === "PRELIMS") return "Prelims";
  if (term === "MIDTERMS") return "Midterms";
  return "Finals";
}

export default async function InstructorCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "INSTRUCTOR") {
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

  if (!course || course.instructorId !== session.userId) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title={course.title}
      description={course.description || "No description"}
      actions={[
        {
          label: "Edit Settings",
          href: `/instructor/courses/${course.id}/edit`,
          variant: "secondary",
        },
        {
          label: "Students",
          href: `/instructor/courses/${course.id}/students`,
          variant: "secondary",
        },
        {
          label: "Grades",
          href: `/instructor/courses/${course.id}/grades`,
          variant: "secondary",
        },
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
        {
          label: "Danger Zone",
          href: `/instructor/courses/${course.id}/danger-zone`,
          variant: "secondary",
        },
      ]}
    >
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3 text-sm">
          {course.courseCode && (
            <span className="rounded-full border border-gray-300 px-4 py-2">
              Code: {course.courseCode}
            </span>
          )}
          {course.program && (
            <span className="rounded-full border border-gray-300 px-4 py-2">
              Program: {course.program}
            </span>
          )}
          {course.section && (
            <span className="rounded-full border border-gray-300 px-4 py-2">
              Section: {course.section}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
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
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
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
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{material.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-gray-300 px-3 py-1">
                          {material.materialType}
                        </span>
                        <span className="rounded-full border border-gray-300 px-3 py-1">
                          {termLabel(material.term)}
                        </span>
                        {material.fileType && (
                          <span className="rounded-full border border-gray-300 px-3 py-1">
                            {material.fileType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {material.materialType === "TEXT" ? (
                      <Link
                        href={`/instructor/courses/${course.id}/materials/${material.id}`}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        Open Text
                      </Link>
                    ) : material.fileUrl ? (
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        Open Material
                      </a>
                    ) : null}

                    <Link
                      href={`/instructor/courses/${course.id}/materials/${material.id}/edit`}
                      className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      Edit
                    </Link>

                    <DeleteMaterialButton materialId={material.id} />
                  </div>
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
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
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
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{quiz.title}</p>
                      <p className="mt-2 text-sm text-gray-600">
                        {quiz.description || "No description"}
                      </p>
                    </div>

                    <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                      {quiz.quizType}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="rounded-full border border-gray-300 px-3 py-1">
                      Max Attempts: {quiz.maxAttempts}
                    </span>
                    <span className="rounded-full border border-gray-300 px-3 py-1">
                      Adaptive: {quiz.adaptiveMode ? "Yes" : "No"}
                    </span>
                    <span className="rounded-full border border-gray-300 px-3 py-1">
                      Opens: {formatSchedule(quiz.opensAt) || "Immediately"}
                    </span>
                    <span className="rounded-full border border-gray-300 px-3 py-1">
                      Closes: {formatSchedule(quiz.closesAt) || "No close"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}