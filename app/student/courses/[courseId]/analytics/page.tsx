import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { buildGradeRows } from "@/lib/grades";
import StudentShell from "@/components/student/StudentShell";
import AnalyticsBarChart from "@/components/analytics/AnalyticsBarChart";

function termLabel(term: string) {
  if (term === "PRELIMS") return "Prelims";
  if (term === "MIDTERMS") return "Midterms";
  return "Finals";
}

export default async function StudentCourseAnalyticsPage({
  params,
}: {
  params: Promise<{ courseId: string }> ;
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

  const [course, user, attempts, activityLogs] = await Promise.all([
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
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId: session.userId,
        quiz: {
          courseId,
        },
      },
      select: {
        id: true,
        score: true,
        startedAt: true,
        finishedAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            term: true,
          },
        },
      },
      orderBy: {
        startedAt: "asc",
      },
    }),
    prisma.activityLog.findMany({
      where: {
        userId: session.userId,
        courseId,
      },
      select: {
        id: true,
        actionType: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  if (!course || !user) {
    redirect("/student/courses");
  }

  const [gradeRow] = buildGradeRows({
    quizzes: course.quizzes,
    students: [user],
    attempts: attempts.map((attempt) => ({
      studentId: user.id,
      quizId: attempt.quiz.id,
      score: attempt.score,
    })),
  });

  const overallAverage =
    attempts.length > 0
      ? attempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
        attempts.length
      : 0;

  const bestScore =
    attempts.length > 0
      ? Math.max(...attempts.map((attempt) => attempt.score ?? 0))
      : 0;

  const actionTypes = [
    "OPEN_MATERIAL",
    "START_QUIZ",
    "ANSWER_QUESTION",
    "SUBMIT_QUIZ",
    "VIEW_DASHBOARD",
  ] as const;

  const activityBreakdownData = actionTypes.map((actionType) => ({
    label: actionType.replaceAll("_", " "),
    value: activityLogs.filter((log) => log.actionType === actionType).length,
  }));

  const bestScorePerQuizData = course.quizzes.map((quiz) => {
    const quizAttempts = attempts.filter((attempt) => attempt.quiz.id === quiz.id);
    const best =
      quizAttempts.length > 0
        ? Math.max(...quizAttempts.map((attempt) => attempt.score ?? 0))
        : 0;

    return {
      label: quiz.title,
      value: best,
      helper: termLabel(quiz.term),
    };
  });

  const termGradeData = gradeRow.terms.map((term) => ({
    label: termLabel(term.term),
    value: term.termGrade,
    helper: `Total ${term.totalScore.toFixed(2)} / ${term.totalMaxScore.toFixed(2)}`,
  }));

  const recent7Days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = activityLogs.filter(
      (log) => log.createdAt >= date && log.createdAt < nextDate
    ).length;

    return {
      label: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: count,
    };
  });

  return (
    <StudentShell
      title={`${course.title} Analytics`}
      description="See your own activity, term performance, and quiz trends for this course."
      sessionEmail={session.email}
      actions={[
        {
          label: "Back to Course",
          href: `/student/courses/${courseId}`,
          variant: "secondary",
        },
        {
          label: "Grades",
          href: `/student/courses/${courseId}/grades`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Total Attempts
          </p>
          <p className="mt-3 text-3xl font-bold">{attempts.length}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Average Score
          </p>
          <p className="mt-3 text-3xl font-bold">{overallAverage.toFixed(2)}%</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Best Score
          </p>
          <p className="mt-3 text-3xl font-bold">{bestScore.toFixed(2)}%</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Logged Activities
          </p>
          <p className="mt-3 text-3xl font-bold">{activityLogs.length}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
            Semestral Grade
          </p>
          <p className="mt-3 text-3xl font-bold">
            {gradeRow.semestralGrade.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <AnalyticsBarChart
          title="Term Grades"
          data={termGradeData}
          suffix="%"
          emptyMessage="No term grade data yet."
        />

        <AnalyticsBarChart
          title="Best Score per Quiz"
          data={bestScorePerQuizData}
          suffix="%"
          emptyMessage="No quiz score data yet."
        />

        <AnalyticsBarChart
          title="Activity Breakdown"
          data={activityBreakdownData}
          emptyMessage="No activity logs recorded yet."
        />

        <AnalyticsBarChart
          title="Activity in the Last 7 Days"
          data={recent7Days}
          emptyMessage="No recent activity yet."
        />
      </div>
    </StudentShell>
  );
}