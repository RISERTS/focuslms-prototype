import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { buildGradeRows } from "@/lib/grades";
import InstructorShell from "@/components/instructor/InstructorShell";

export default async function InstructorGradesPage({
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
      enrollments: {
        where: {
          status: "APPROVED",
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!course || course.instructorId !== session.userId) {
    redirect("/login");
  }

  const studentIds = course.enrollments.map((enrollment) => enrollment.user.id);

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      studentId: { in: studentIds },
      quiz: { courseId },
    },
    select: {
      studentId: true,
      quizId: true,
      score: true,
    },
  });

  const rows = buildGradeRows({
    quizzes: course.quizzes,
    students: course.enrollments.map((enrollment) => enrollment.user),
    attempts,
  });

  return (
    <InstructorShell
      title={`${course.title} Grades`}
      description="View term grades and semestral grade for all approved students."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Prelims</th>
                <th className="px-3 py-3">Midterms</th>
                <th className="px-3 py-3">Finals</th>
                <th className="px-3 py-3">Semestral</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-600">
                    No approved students yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.studentId} className="border-b border-gray-100">
                    <td className="px-3 py-4">
                      <Link
                        href={`/instructor/courses/${courseId}/grades/${row.studentId}`}
                        className="font-medium underline"
                      >
                        {row.name}
                      </Link>
                      <div className="text-gray-500">{row.email}</div>
                    </td>
                    <td className="px-3 py-4">
                      {row.terms[0].termGrade.toFixed(2)}%
                    </td>
                    <td className="px-3 py-4">
                      {row.terms[1].termGrade.toFixed(2)}%
                    </td>
                    <td className="px-3 py-4">
                      {row.terms[2].termGrade.toFixed(2)}%
                    </td>
                    <td className="px-3 py-4 font-semibold">
                      {row.semestralGrade.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </InstructorShell>
  );
}