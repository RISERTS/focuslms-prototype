import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import TrackedMaterialLink from "@/components/TrackedMaterialLink";
import StudentShell from "@/components/student/StudentShell";

function termLabel(term: string) {
  if (term === "PRELIMS") return "Prelims";
  if (term === "MIDTERMS") return "Midterms";
  return "Finals";
}

export default async function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const { courseId } = await params;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId,
      },
    },
    select: {
      status: true,
    },
  });

  if (!enrollment || enrollment.status !== "APPROVED") {
    redirect("/student/courses");
  }

  const [course, latestAttempts] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: {
          select: {
            name: true,
            email: true,
          },
        },
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
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId: session.userId,
        finishedAt: {
          not: null,
        },
        quiz: {
          courseId,
        },
      },
      orderBy: {
        finishedAt: "desc",
      },
      select: {
        id: true,
        quizId: true,
      },
    }),
  ]);

  if (!course) {
    return (
      <StudentShell
        title="Course Not Found"
        description="The requested course could not be found."
        actions={[
          {
            label: "Back to Courses",
            href: "/student/enrolled",
            variant: "secondary",
          },
        ]}
      >
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold">This course does not exist.</p>
        </div>
      </StudentShell>
    );
  }

  const latestAttemptMap = new Map<string, string>();
  for (const attempt of latestAttempts) {
    if (!latestAttemptMap.has(attempt.quizId)) {
      latestAttemptMap.set(attempt.quizId, attempt.id);
    }
  }

  return (
    <StudentShell
      title={course.title}
      description={course.description || "No description"}
      sessionEmail={session.email}
      actions={[
        {
          label: "My Courses",
          href: "/student/enrolled",
          variant: "secondary",
        },
        {
          label: "Grades",
          href: `/student/courses/${course.id}/grades`,
          variant: "secondary",
        },
        {
          label: "Analytics",
          href: `/student/courses/${course.id}/analytics`,
          variant: "secondary",
        },
        {
          label: "Browse Courses",
          href: "/student/courses",
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
          <span className="rounded-full border border-gray-300 px-4 py-2">
            Instructor: {course.instructor.name}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Learning Materials</h2>

          <div className="mt-6 space-y-4">
            {course.materials.length === 0 ? (
              <p className="text-sm text-gray-600">No materials available yet.</p>
            ) : (
              course.materials.map((material) => (
                <div
                  key={material.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{material.title}</p>
                      <p className="mt-2 text-sm text-gray-500">
                        Type: {material.fileType}
                      </p>
                    </div>

                    <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700">
                      {termLabel(material.term)}
                    </span>
                  </div>

                  <TrackedMaterialLink
                    href={material.fileUrl}
                    courseId={course.id}
                    materialId={material.id}
                  >
                    Open Material
                  </TrackedMaterialLink>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Quizzes</h2>

          <div className="mt-6 space-y-4">
            {course.quizzes.length === 0 ? (
              <p className="text-sm text-gray-600">No quizzes available yet.</p>
            ) : (
              course.quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{quiz.title}</p>
                      <p className="mt-2 text-sm text-gray-600">
                        {quiz.description || "No description"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                        {quiz.quizType}
                      </span>
                      <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700">
                        {termLabel(quiz.term)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="rounded-full border border-gray-300 px-3 py-1">
                      Max Attempts: {quiz.maxAttempts}
                    </span>
                    <span className="rounded-full border border-gray-300 px-3 py-1">
                      Adaptive: {quiz.adaptiveMode ? "Yes" : "No"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/student/courses/${course.id}/quizzes/${quiz.id}`}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                      Open Quiz
                    </Link>

                    {latestAttemptMap.has(quiz.id) && (
                      <Link
                        href={`/student/courses/${course.id}/quizzes/${quiz.id}/review`}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Review Latest Attempt
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </StudentShell>
  );
}