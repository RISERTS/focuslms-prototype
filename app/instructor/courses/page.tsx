import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

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
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Courses</h1>
        <Link
          href="/instructor/courses/create"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Create Course
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {courses.length === 0 ? (
          <p>No courses created yet.</p>
        ) : (
          courses.map((course) => (
            <Link
              key={course.id}
              href={`/instructor/courses/${course.id}`}
              className="block rounded border p-4"
            >
              <h2 className="text-xl font-semibold">{course.title}</h2>
              <p className="mt-2 text-gray-600">
                {course.description || "No description"}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}