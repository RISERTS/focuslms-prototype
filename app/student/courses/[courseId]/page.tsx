import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import TrackedMaterialLink from "@/components/TrackedMaterialLink";

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
  });

  if (!enrollment) {
    redirect("/student/courses");
  }

  const course = await prisma.course.findUnique({
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
  });

  if (!course) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">Course not found</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">{course.title}</h1>
      <p className="mt-2 text-gray-600">
        {course.description || "No description"}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Instructor: {course.instructor.name} ({course.instructor.email})
      </p>

      <div className="mt-8 space-y-4">
        <h2 className="text-2xl font-semibold">Materials</h2>
        {course.materials.length === 0 ? (
          <p>No materials available yet.</p>
        ) : (
          course.materials.map((material) => (
            <div key={material.id} className="rounded border p-4">
              <h3 className="text-lg font-semibold">{material.title}</h3>
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

      <div className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold">Quizzes</h2>
        {course.quizzes.length === 0 ? (
          <p>No quizzes available yet.</p>
        ) : (
          course.quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/student/courses/${course.id}/quizzes/${quiz.id}`}
              className="block rounded border p-4"
            >
              <h3 className="text-lg font-semibold">{quiz.title}</h3>
              <p className="mt-2 text-gray-600">
                {quiz.description || "No description"}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}