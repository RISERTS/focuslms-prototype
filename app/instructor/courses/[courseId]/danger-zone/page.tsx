import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import DeleteCourseForm from "./delete-course-form";

export default async function CourseDangerZonePage({
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
  });

  if (!course || course.instructorId !== session.userId) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title="Danger Zone"
      description="Deleting a course permanently removes its related quizzes, attempts, answers, materials, enrollments, and logs."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <DeleteCourseForm
        courseId={courseId}
        courseTitle={course.title}
      />
    </InstructorShell>
  );
}