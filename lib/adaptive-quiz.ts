type Difficulty = "EASY" | "MEDIUM" | "HARD";

type QuestionLike = {
  id: string;
  difficulty: Difficulty;
  questionType:
    | "MULTIPLE_CHOICE"
    | "IDENTIFICATION"
    | "ESSAY"
    | "COMPUTATIONAL";
};

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

export function nextDifficulty(params: {
  currentDifficulty: Difficulty;
  isCorrect: boolean;
  responseTimeSeconds: number;
  timeThresholdSeconds: number;
}): Difficulty {
  const {
    currentDifficulty,
    isCorrect,
    responseTimeSeconds,
    timeThresholdSeconds,
  } = params;

  if (!isCorrect) {
    if (currentDifficulty === "HARD") return "MEDIUM";
    if (currentDifficulty === "MEDIUM") return "EASY";
    return "EASY";
  }

  if (responseTimeSeconds <= timeThresholdSeconds) {
    if (currentDifficulty === "EASY") return "MEDIUM";
    if (currentDifficulty === "MEDIUM") return "HARD";
    return "HARD";
  }

  return currentDifficulty;
}

function pickByDifficulty<T extends QuestionLike>(
  items: T[],
  difficulty: Difficulty
): T | null {
  const matches = items.filter((q) => q.difficulty === difficulty);
  if (matches.length === 0) return null;
  return shuffleArray(matches)[0];
}

export function selectAdaptiveQuestion<T extends QuestionLike>(params: {
  questions: T[];
  previousSeenQuestionIds: string[];
  currentAttemptSeenQuestionIds: string[];
  targetDifficulty: Difficulty;
  avoidRepeatedQuestions: boolean;
  allowEssay: boolean;
}): T | null {
  const {
    questions,
    previousSeenQuestionIds,
    currentAttemptSeenQuestionIds,
    targetDifficulty,
    avoidRepeatedQuestions,
    allowEssay,
  } = params;

  const basePool = questions.filter((q) => {
    if (currentAttemptSeenQuestionIds.includes(q.id)) return false;
    if (!allowEssay && q.questionType === "ESSAY") return false;
    return true;
  });

  if (basePool.length === 0) return null;

  if (avoidRepeatedQuestions) {
    const unseenAcrossAttempts = basePool.filter(
      (q) => !previousSeenQuestionIds.includes(q.id)
    );

    const strictMatch = pickByDifficulty(unseenAcrossAttempts, targetDifficulty);
    if (strictMatch) return strictMatch;

    if (unseenAcrossAttempts.length > 0) {
      return shuffleArray(unseenAcrossAttempts)[0];
    }
  }

  const relaxedMatch = pickByDifficulty(basePool, targetDifficulty);
  if (relaxedMatch) return relaxedMatch;

  return shuffleArray(basePool)[0] ?? null;
}