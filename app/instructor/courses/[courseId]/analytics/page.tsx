import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import AnalyticsBarChart from "@/components/analytics/AnalyticsBarChart";

function termLabel(term: string) {
  if (term === "PRELIMS") return "Prelims";
  if (term === "MIDTERMS") return "Midterms";
  return "Finals";
}

export default async function InstructorCourseAnalyticsPage({
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
      materials: {
        select: {
          id: true,
          title: true,
          term: true,
        },
      },
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

  const [attempts, activityLogs] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: {
        quiz: {
          courseId,
        },
      },
      select: {
        id: true,
        score: true,
        studentId: true,
        startedAt: true,
        finishedAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            term: true,
          },
        },
        student: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        courseId,
      },
      select: {
        id: true,
        actionType: true,
        targetId: true,
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  const averageScore =
    attempts.length > 0
      ? attempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
        attempts.length
      : 0;

  const attemptsPerQuiz = course.quizzes.map((quiz) => ({
    label: quiz.title,
    value: attempts.filter((attempt) => attempt.quiz.id === quiz.id).length,
    helper: termLabel(quiz.term),
  }));

  const averageScorePerQuiz = course.quizzes.map((quiz) => {
    const quizAttempts = attempts.filter((attempt) => attempt.quiz.id === quiz.id);
    const avg =
      quizAttempts.length > 0
        ? quizAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
          quizAttempts.length
        : 0;

    return {
      label: quiz.title,
      value: avg,
      helper: termLabel(quiz.term),
    };
  });

  const termAverageData = ["PRELIMS", "MIDTERMS", "FINALS"].map((term) => {
    const termAttempts = attempts.filter((attempt) => attempt.quiz.term === term);
    const avg =
      termAttempts.length > 0
        ? termAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
          termAttempts.length
        : 0;

    return {
      label: termLabel(term),
      value: avg,
    };
  });

  const materialOpenData = course.materials.map((material) => ({
    label: material.title,
    value: activityLogs.filter(
      (log) => log.actionType === "OPEN_MATERIAL" && log.targetId === material.id
    ).length,
    helper: termLabel(material.term),
  }));

  const studentPerformanceData = course.enrollments.map((enrollment) => {
    const studentAttempts = attempts.filter(
      (attempt) => attempt.studentId === enrollment.user.id
    );

    const avg =
      studentAttempts.length > 0
        ? studentAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
          studentAttempts.length
        : 0;

    return {
      label: enrollment.user.name,
      value: avg,
      helper: enrollment.user.email,
    };
  });

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

  return (
    <InstructorShell
      title={`${course.title} Analytics`}
      description="View course-level activity, quiz trends, material engagement, and student performance."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Approved Students
          </p>
          <p className="mt-3 text-3xl font-bold">{course.enrollments.length}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Materials
          </p>
          <p className="mt-3 text-3xl font-bold">{course.materials.length}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Quizzes
          </p>
          <p className="mt-3 text-3xl font-bold">{course.quizzes.length}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Total Attempts
          </p>
          <p className="mt-3 text-3xl font-bold">{attempts.length}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
            Average Score
          </p>
          <p className="mt-3 text-3xl font-bold">{averageScore.toFixed(2)}%</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <AnalyticsBarChart
          title="Attempts per Quiz"
          data={attemptsPerQuiz}
          emptyMessage="No quiz attempts yet."
        />

        <AnalyticsBarChart
          title="Average Score per Quiz"
          data={averageScorePerQuiz}
          suffix="%"
          emptyMessage="No scored attempts yet."
        />

        <AnalyticsBarChart
          title="Average Score by Term"
          data={termAverageData}
          suffix="%"
          emptyMessage="No term score data yet."
        />

        <AnalyticsBarChart
          title="Material Opens"
          data={materialOpenData}
          emptyMessage="No material opens recorded yet."
        />

        <AnalyticsBarChart
          title="Student Performance"
          data={studentPerformanceData}
          suffix="%"
          emptyMessage="No student attempt data yet."
        />

        <AnalyticsBarChart
          title="Activity Breakdown"
          data={activityBreakdownData}
          emptyMessage="No activity logs recorded yet."
        />
      </div>
    </InstructorShell>
  );
}