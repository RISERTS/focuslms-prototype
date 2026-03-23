type ReviewQuestion = {
  id: string;
  questionText: string;
  questionType: string;
  correctAnswer: string | null;
};

type ReviewAnswer = {
  id: string;
  selectedAnswer: string;
  isCorrect: boolean;
  responseTimeSeconds: number;
  manualScore: number | null;
  instructorFeedback: string | null;
  question: ReviewQuestion;
};

type AttemptReview = {
  id: string;
  score: number | null;
  startedAt: string;
  finishedAt: string | null;
  answers: ReviewAnswer[];
};

export default function AttemptReviewView({
  attempt,
  title,
  subtitle,
}: {
  attempt: AttemptReview;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Started
          </p>
          <p className="mt-3 text-sm text-gray-800">
            {new Date(attempt.startedAt).toLocaleString()}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Finished
          </p>
          <p className="mt-3 text-sm text-gray-800">
            {attempt.finishedAt
              ? new Date(attempt.finishedAt).toLocaleString()
              : "Not finished"}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-6 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
            Score
          </p>
          <p className="mt-3 text-3xl font-bold">
            {attempt.score !== null ? `${attempt.score.toFixed(2)}%` : "-"}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}

        <div className="mt-6 space-y-4">
          {attempt.answers.length === 0 ? (
            <p className="text-sm text-gray-600">No answers recorded.</p>
          ) : (
            attempt.answers.map((answer, index) => (
              <div
                key={answer.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                <p className="font-semibold">
                  {index + 1}. {answer.question.questionText}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Type: {answer.question.questionType}
                </p>

                <div className="mt-4 space-y-2 text-sm text-gray-700">
                  <p>
                    Your Answer:{" "}
                    <span className="font-medium text-gray-900">
                      {answer.selectedAnswer || "(blank)"}
                    </span>
                  </p>

                  {answer.question.questionType !== "ESSAY" && (
                    <p>
                      Correct Answer:{" "}
                      <span className="font-medium text-gray-900">
                        {answer.question.correctAnswer || "-"}
                      </span>
                    </p>
                  )}

                  <p>
                    Result:{" "}
                    <span
                      className={
                        answer.isCorrect
                          ? "font-medium text-green-700"
                          : "font-medium text-red-700"
                      }
                    >
                      {answer.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </p>

                  <p>
                    Response Time:{" "}
                    <span className="font-medium text-gray-900">
                      {answer.responseTimeSeconds}s
                    </span>
                  </p>

                  {answer.manualScore !== null && (
                    <p>
                      Manual Score:{" "}
                      <span className="font-medium text-gray-900">
                        {answer.manualScore.toFixed(2)}
                      </span>
                    </p>
                  )}

                  {answer.instructorFeedback && (
                    <p>
                      Instructor Feedback:{" "}
                      <span className="font-medium text-gray-900">
                        {answer.instructorFeedback}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}