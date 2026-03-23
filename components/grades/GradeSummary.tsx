import { GradeRow } from "@/lib/grades";

function termLabel(term: string) {
  if (term === "PRELIMS") return "Prelims";
  if (term === "MIDTERMS") return "Midterms";
  return "Finals";
}

export default function GradeSummary({
  row,
  title,
  subtitle,
}: {
  row: GradeRow;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-4">
        {row.terms.map((term) => (
          <div
            key={term.term}
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
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
            {row.semestralGrade.toFixed(2)}%
          </p>
        </div>
      </div>

      {row.terms.map((term) => (
        <div
          key={term.term}
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-bold">{termLabel(term.term)}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {title}
            {subtitle ? ` • ${subtitle}` : ""}
          </p>

          <div className="mt-6 space-y-4">
            {term.quizzes.length === 0 ? (
              <p className="text-sm text-gray-600">No quizzes for this term yet.</p>
            ) : (
              term.quizzes.map((quiz) => (
                <div
                  key={quiz.quizId}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
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
  );
}