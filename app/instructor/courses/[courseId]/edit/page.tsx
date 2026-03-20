import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import EditCourseSettingsForm from "./course-settings-form";

export default async function EditCourseSettingsPage({
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
      title="Edit Course Settings"
      description="Update the course code, title, program, section, and description."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <EditCourseSettingsForm
        courseId={courseId}
        initialData={{
          courseCode: course.courseCode ?? "",
          title: course.title,
          program: course.program ?? "",
          section: course.section ?? "",
          description: course.description ?? "",
        }}
      />
    </InstructorShell>
  );
}