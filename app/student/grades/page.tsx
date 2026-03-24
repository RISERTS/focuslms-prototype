import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { buildGradeRows } from "@/lib/grades";
import StudentShell from "@/components/student/StudentShell";

function termLabel(term: string) {
  if (term === "PRELIMS") return "Prelims";
  if (term === "MIDTERMS") return "Midterms";
  return "Finals";
}

export default async function StudentAllGradesPage() {
  const session = await getSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const [user, enrollments, attempts] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    prisma.enrollment.findMany({
      where: {
        userId: session.userId,
        status: "APPROVED",
      },
      select: {
        id: true,
        course: {
          select: {
            id: true,
            title: true,
            description: true,
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId: session.userId,
      },
      select: {
        studentId: true,
        quizId: true,
        score: true,
        quiz: {
          select: {
            courseId: true,
          },
        },
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const gradeCards = enrollments.map((enrollment) => {
    const courseAttempts = attempts
      .filter((attempt) => attempt.quiz.courseId === enrollment.course.id)
      .map((attempt) => ({
        studentId: attempt.studentId,
        quizId: attempt.quizId,
        score: attempt.score,
      }));

    const [row] = buildGradeRows({
      quizzes: enrollment.course.quizzes,
      students: [
        {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      ],
      attempts: courseAttempts,
    });

    return {
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      courseDescription: enrollment.course.description,
      row,
    };
  });

  return (
    <StudentShell
      title="All Course Grades"
      description="View your prelims, midterms, finals, and semestral grades for all your approved courses."
      sessionEmail={session.email}
      actions={[
        {
          label: "My Courses",
          href: "/student/enrolled",
          variant: "secondary",
        },
        {
          label: "Browse Courses",
          href: "/student/courses",
          variant: "secondary",
        },
      ]}
    >
      {gradeCards.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold">No approved courses yet</h2>
          <p className="mt-3 text-sm text-gray-600">
            Once you are approved in a course, its grades will appear here.
          </p>
          <Link
            href="/student/courses"
            className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {gradeCards.map((card) => (
            <div
              key={card.courseId}
              className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{card.courseTitle}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {card.courseDescription || "No description"}
                  </p>
                </div>

                <Link
                  href={`/student/courses/${card.courseId}/grades`}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Open Course Grade Page
                </Link>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-4">
                {card.row.terms.map((term) => (
                  <div
                    key={term.term}
                    className="rounded-3xl border border-gray-200 bg-gray-50 p-6"
                  >
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
                      {termLabel(term.term)}
                    </p>
                    <p className="mt-3 text-sm text-gray-600">
                      Total Score: {term.totalScore.toFixed(2)} /{" "}
                      {term.totalMaxScore.toFixed(2)}
                    </p>
                    <p className="mt-2 text-3xl font-bold">
                      {term.termGrade.toFixed(2)}%
                    </p>
                  </div>
                ))}

                <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
                    Semestral
                  </p>
                  <p className="mt-3 text-3xl font-bold">
                    {card.row.semestralGrade.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-3">
                {card.row.terms.map((term) => (
                  <div
                    key={`${card.courseId}-${term.term}`}
                    className="rounded-3xl border border-gray-200 bg-gray-50 p-6"
                  >
                    <h3 className="text-xl font-bold">{termLabel(term.term)}</h3>

                    <div className="mt-4 space-y-3">
                      {term.quizzes.length === 0 ? (
                        <p className="text-sm text-gray-600">
                          No quizzes for this term yet.
                        </p>
                      ) : (
                        term.quizzes.map((quiz) => (
                          <div
                            key={quiz.quizId}
                            className="rounded-2xl border border-gray-200 bg-white p-4"
                          >
                            <p className="font-semibold">{quiz.quizTitle}</p>
                            <p className="mt-2 text-sm text-gray-600">
                              Best Score:{" "}
                              <span className="font-medium text-gray-900">
                                {quiz.bestScore !== null
                                  ? `${quiz.bestScore.toFixed(2)}%`
                                  : "-"}
                              </span>
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentShell>
  );
}