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
      courseCode: true,
      program: true,
      section: true,
      instructorId: true,
      enrollments: {
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
      },
    },
  });

  if (!course || course.instructorId !== session.userId) {
    redirect("/login");
  }

  const allStudents = await prisma.user.findMany({
    where: {
      role: "STUDENT",
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const enrollmentStatusByStudent = new Map(
    course.enrollments.map((enrollment) => [enrollment.user.id, enrollment.status])
  );

  const approved = course.enrollments.filter(
    (enrollment) => enrollment.status === "APPROVED"
  );

  const pending = course.enrollments.filter(
    (enrollment) => enrollment.status === "PENDING"
  );

  const available = allStudents.filter((student) => {
    const status = enrollmentStatusByStudent.get(student.id);
    return status !== "APPROVED" && status !== "PENDING";
  });

  return (
    <InstructorShell
      title="Student Roster"
      description="Search students, enroll by email, or bulk enroll selected students from the student list."
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
        courseTitle={
          course.courseCode ? `${course.courseCode} — ${course.title}` : course.title
        }
        approved={approved.map((enrollment) => ({
          id: enrollment.id,
          status: String(enrollment.status),
          createdAt: enrollment.createdAt.toISOString(),
          user: {
            id: enrollment.user.id,
            name: enrollment.user.name,
            email: enrollment.user.email,
            role: String(enrollment.user.role),
          },
        }))}
        pending={pending.map((enrollment) => ({
          id: enrollment.id,
          status: String(enrollment.status),
          createdAt: enrollment.createdAt.toISOString(),
          user: {
            id: enrollment.user.id,
            name: enrollment.user.name,
            email: enrollment.user.email,
            role: String(enrollment.user.role),
          },
        }))}
        available={available.map((student) => ({
          id: student.id,
          name: student.name,
          email: student.email,
        }))}
      />
    </InstructorShell>
  );
}