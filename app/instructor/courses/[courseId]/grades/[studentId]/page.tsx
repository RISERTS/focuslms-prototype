import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { buildGradeRows } from "@/lib/grades";
import InstructorShell from "@/components/instructor/InstructorShell";
import GradeSummary from "@/components/grades/GradeSummary";

export default async function InstructorStudentGradeDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; studentId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  const { courseId, studentId } = await params;

  const [course, student, approvedEnrollment, attempts] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        instructorId: true,
        quizzes: {
          select: {
            id: true,
            title: true,
            term: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: studentId,
          courseId,
        },
      },
      select: {
        status: true,
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId,
        quiz: { courseId },
      },
      select: {
        studentId: true,
        quizId: true,
        score: true,
      },
    }),
  ]);

  if (!course || course.instructorId !== session.userId || !student) {
    redirect("/login");
  }

  if (!approvedEnrollment || approvedEnrollment.status !== "APPROVED") {
    redirect(`/instructor/courses/${courseId}/grades`);
  }

  const [row] = buildGradeRows({
    quizzes: course.quizzes,
    students: [student],
    attempts,
  });

  return (
    <InstructorShell
      title={`${student.name} Grade Summary`}
      description={student.email}
      actions={[
        {
          label: "Back to Gradebook",
          href: `/instructor/courses/${courseId}/grades`,
          variant: "secondary",
        },
      ]}
    >
      <GradeSummary
        row={row}
        title={course.title}
        subtitle="Instructor Student View"
      />
    </InstructorShell>
  );
}