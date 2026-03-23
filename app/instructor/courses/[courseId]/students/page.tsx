import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import StudentRosterManager from "./student-roster-manager";

export default async function InstructorStudentsPage({
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
    select: {
      id: true,
      title: true,
      instructorId: true,
    },
  });

  if (!course || course.instructorId !== session.userId) {
    redirect("/login");
  }

  const [enrollments, availableStudents] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        courseId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "STUDENT",
        NOT: {
          enrollments: {
            some: {
              courseId,
              status: "APPROVED",
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        enrollments: {
          where: {
            courseId,
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return (
    <InstructorShell
      title={`${course.title} Students`}
      description="Approve student requests, directly enroll students, and remove approved students from this course."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <StudentRosterManager
        courseId={courseId}
        courseTitle={course.title}
        approved={enrollments
          .filter((e) => e.status === "APPROVED")
          .map((e) => ({
            id: e.id,
            status: e.status,
            createdAt: e.createdAt.toISOString(),
            user: e.user,
          }))}
        pending={enrollments
          .filter((e) => e.status === "PENDING")
          .map((e) => ({
            id: e.id,
            status: e.status,
            createdAt: e.createdAt.toISOString(),
            user: e.user,
          }))}
        availableStudents={availableStudents}
      />
    </InstructorShell>
  );
}