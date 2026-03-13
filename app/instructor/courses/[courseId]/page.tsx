import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

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
    },
  });

  if (!course) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">Course not found</h1>
      </main>
    );
  }

  if (course.instructorId !== session.userId) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="mt-2 text-gray-600">
            {course.description || "No description"}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/instructor/courses/${course.id}/add-material`}
            className="rounded border px-4 py-2"
          >
            Add Material
          </Link>
          <Link
            href={`/instructor/courses/${course.id}/quizzes`}
            className="rounded bg-black px-4 py-2 text-white"
          >
            Manage Quizzes
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-2xl font-semibold">Materials</h2>

        {course.materials.length === 0 ? (
          <p>No materials added yet.</p>
        ) : (
          course.materials.map((material) => (
            <div key={material.id} className="rounded border p-4">
              <h3 className="text-lg font-semibold">{material.title}</h3>
              <p className="mt-2 text-sm text-gray-500">
                Type: {material.fileType}
              </p>
              <a
                href={material.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block underline"
              >
                Open Material
              </a>
            </div>
          ))
        )}
      </div>

      <div className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold">Quizzes</h2>

        {course.quizzes.length === 0 ? (
          <p>No quizzes created yet.</p>
        ) : (
          course.quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/instructor/courses/${course.id}/quizzes/${quiz.id}`}
              className="block rounded border p-4"
            >
              <h3 className="text-lg font-semibold">{quiz.title}</h3>
              <p className="mt-2 text-gray-600">{quiz.description || "No description"}</p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
