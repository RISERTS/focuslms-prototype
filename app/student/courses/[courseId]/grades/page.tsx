import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { buildGradeRows } from "@/lib/grades";
import StudentShell from "@/components/student/StudentShell";
import GradeSummary from "@/components/grades/GradeSummary";

export default async function StudentGradesPage({
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
    select: {
      status: true,
    },
  });

  if (!enrollment || enrollment.status !== "APPROVED") {
    redirect("/student/courses");
  }

  const [course, user, attempts] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
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
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId: session.userId,
        quiz: { courseId },
      },
      select: {
        studentId: true,
        quizId: true,
        score: true,
      },
    }),
  ]);

  if (!course || !user) {
    redirect("/student/courses");
  }

  const [row] = buildGradeRows({
    quizzes: course.quizzes,
    students: [user],
    attempts,
  });

  return (
    <StudentShell
      title={`${course.title} Grades`}
      description="View your term grades and semestral grade for this course."
      sessionEmail={session.email}
      actions={[
        {
          label: "Back to Course",
          href: `/student/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <GradeSummary row={row} title={course.title} subtitle="Student View" />
    </StudentShell>
  );
}