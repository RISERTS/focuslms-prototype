import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export default async function StudentEnrolledCoursesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "STUDENT") {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.userId,
    },
    include: {
      course: {
        include: {
          instructor: {
            select: {
              name: true,
              email: true,
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
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">My Enrolled Courses</h1>

      <div className="mt-8 space-y-4">
        {enrollments.length === 0 ? (
          <p>You are not enrolled in any courses yet.</p>
        ) : (
          enrollments.map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/student/courses/${enrollment.course.id}`}
              className="block rounded border p-4"
            >
              <h2 className="text-xl font-semibold">
                {enrollment.course.title}
              </h2>
              <p className="mt-2 text-gray-600">
                {enrollment.course.description || "No description"}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Instructor: {enrollment.course.instructor.name} (
                {enrollment.course.instructor.email})
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}