export type TermCategory = "PRELIMS" | "MIDTERMS" | "FINALS";

export type GradeQuizLite = {
  id: string;
  title: string;
  term: TermCategory;
};

export type GradeStudentLite = {
  id: string;
  name: string;
  email: string;
};

export type GradeAttemptLite = {
  studentId: string;
  quizId: string;
  score: number | null;
};

export type GradeTermSummary = {
  term: TermCategory;
  quizzes: {
    quizId: string;
    quizTitle: string;
    bestScore: number | null;
  }[];
  totalScore: number;
  totalMaxScore: number;
  termGrade: number;
};

export type GradeRow = {
  studentId: string;
  name: string;
  email: string;
  terms: GradeTermSummary[];
  semestralGrade: number;
};

const TERM_ORDER: TermCategory[] = ["PRELIMS", "MIDTERMS", "FINALS"];

export function buildGradeRows(args: {
  quizzes: GradeQuizLite[];
  students: GradeStudentLite[];
  attempts: GradeAttemptLite[];
}): GradeRow[] {
  const { quizzes, students, attempts } = args;

  return students.map((student) => {
    const terms = TERM_ORDER.map((term) => {
      const termQuizzes = quizzes.filter((quiz) => quiz.term === term);

      const quizzesWithScores = termQuizzes.map((quiz) => {
        const matchingAttempts = attempts.filter(
          (attempt) =>
            attempt.studentId === student.id &&
            attempt.quizId === quiz.id &&
            attempt.score !== null
        );

        const bestScore =
          matchingAttempts.length > 0
            ? Math.max(...matchingAttempts.map((attempt) => attempt.score ?? 0))
            : null;

        return {
          quizId: quiz.id,
          quizTitle: quiz.title,
          bestScore,
        };
      });

      const totalScore = quizzesWithScores.reduce(
        (sum, item) => sum + (item.bestScore ?? 0),
        0
      );

      const totalMaxScore = termQuizzes.length * 100;

      const termGrade =
        termQuizzes.length > 0 ? totalScore / termQuizzes.length : 0;

      return {
        term,
        quizzes: quizzesWithScores,
        totalScore,
        totalMaxScore,
        termGrade,
      };
    });

    const semestralGrade =
      terms.reduce((sum, term) => sum + term.termGrade, 0) / 3;

    return {
      studentId: student.id,
      name: student.name,
      email: student.email,
      terms,
      semestralGrade,
    };
  });
}