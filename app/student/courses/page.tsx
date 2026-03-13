import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import EnrollButton from "./EnrollButton";

export default async function StudentCoursesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "STUDENT") {
    redirect("/login");
  }

  const courses = await prisma.course.findMany({
    include: {
      instructor: {
        select: {
          name: true,
          email: true,
        },
      },
      enrollments: {
        where: {
          userId: session.userId,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Available Courses</h1>

      <div className="mt-8 space-y-4">
        {courses.length === 0 ? (
          <p>No courses available yet.</p>
        ) : (
          courses.map((course) => {
            const alreadyEnrolled = course.enrollments.length > 0;

            return (
              <div key={course.id} className="rounded border p-4">
                <h2 className="text-xl font-semibold">{course.title}</h2>
                <p className="mt-2 text-gray-600">
                  {course.description || "No description"}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Instructor: {course.instructor.name} ({course.instructor.email})
                </p>

                <div className="mt-4">
                  {alreadyEnrolled ? (
                    <span className="font-medium text-green-600">
                      Already enrolled
                    </span>
                  ) : (
                    <EnrollButton courseId={course.id} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}