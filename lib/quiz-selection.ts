type QuestionLike = {
  id: string;
};

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

export function selectQuestionsForAttempt<T extends QuestionLike>(params: {
  allQuestions: T[];
  seenQuestionIds: string[];
  questionsPerAttempt: number | null;
  avoidRepeatedQuestions: boolean;
}): T[] {
  const {
    allQuestions,
    seenQuestionIds,
    questionsPerAttempt,
    avoidRepeatedQuestions,
  } = params;

  const targetCount =
    questionsPerAttempt && questionsPerAttempt > 0
      ? Math.min(questionsPerAttempt, allQuestions.length)
      : allQuestions.length;

  if (!avoidRepeatedQuestions) {
    return shuffleArray(allQuestions).slice(0, targetCount);
  }

  const unseen = allQuestions.filter((q) => !seenQuestionIds.includes(q.id));
  const seen = allQuestions.filter((q) => seenQuestionIds.includes(q.id));

  let selected = shuffleArray(unseen).slice(0, targetCount);

  if (selected.length < targetCount) {
    const needed = targetCount - selected.length;
    const extra = shuffleArray(seen).slice(0, needed);
    selected = [...selected, ...extra];
  }

  return shuffleArray(selected);
}