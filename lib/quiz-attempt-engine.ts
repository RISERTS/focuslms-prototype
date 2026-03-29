import {
  getMixedCompositionCounts,
  type QuizCompositionMode,
  type QuizType,
} from "@/lib/quiz-composition";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type QuestionType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL";

type EngineQuestion = {
  id: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  timeThresholdSeconds: number;
  correctAnswer: string | null;
};

type EngineAnswered = {
  questionId: string;
  selectedAnswer: string;
  responseTimeSeconds: number;
  isCorrect: boolean;
  question: EngineQuestion;
};

type EngineQuiz = {
  id: string;
  quizType: QuizType;
  adaptiveMode: boolean;
  questionsPerAttempt: number | null;
  compositionMode: QuizCompositionMode;
  mcqPercentage: number | null;
  identificationPercentage: number | null;
  essayPercentage: number | null;
  computationalPercentage: number | null;
  mcqCount: number | null;
  identificationCount: number | null;
  essayCount: number | null;
  computationalCount: number | null;
  avoidRepeatedQuestions: boolean;
  questions: EngineQuestion[];
};

const QUESTION_TYPE_ORDER: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "IDENTIFICATION",
  "ESSAY",
  "COMPUTATIONAL",
];

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getSingleTypeTotalCount(quiz: EngineQuiz) {
  if (quiz.questionsPerAttempt && quiz.questionsPerAttempt > 0) {
    return quiz.questionsPerAttempt;
  }

  return quiz.questions.filter(
    (question) => question.questionType === quiz.quizType
  ).length;
}

export function getTotalQuestionsForAttempt(quiz: EngineQuiz) {
  if (quiz.quizType !== "MIXED") {
    return getSingleTypeTotalCount(quiz);
  }

  const counts = getMixedCompositionCounts({
    quizType: quiz.quizType,
    questionsPerAttempt: quiz.questionsPerAttempt,
    compositionMode: quiz.compositionMode,
    mcqPercentage: quiz.mcqPercentage,
    identificationPercentage: quiz.identificationPercentage,
    essayPercentage: quiz.essayPercentage,
    computationalPercentage: quiz.computationalPercentage,
    mcqCount: quiz.mcqCount,
    identificationCount: quiz.identificationCount,
    essayCount: quiz.essayCount,
    computationalCount: quiz.computationalCount,
  });

  return (
    counts.MULTIPLE_CHOICE +
    counts.IDENTIFICATION +
    counts.ESSAY +
    counts.COMPUTATIONAL
  );
}

function getRemainingTypeCounts(quiz: EngineQuiz, answered: EngineAnswered[]) {
  if (quiz.quizType !== "MIXED") {
    const remaining = Math.max(0, getSingleTypeTotalCount(quiz) - answered.length);

    return {
      MULTIPLE_CHOICE: quiz.quizType === "MULTIPLE_CHOICE" ? remaining : 0,
      IDENTIFICATION: quiz.quizType === "IDENTIFICATION" ? remaining : 0,
      ESSAY: quiz.quizType === "ESSAY" ? remaining : 0,
      COMPUTATIONAL: quiz.quizType === "COMPUTATIONAL" ? remaining : 0,
    };
  }

  const targetCounts = getMixedCompositionCounts({
    quizType: quiz.quizType,
    questionsPerAttempt: quiz.questionsPerAttempt,
    compositionMode: quiz.compositionMode,
    mcqPercentage: quiz.mcqPercentage,
    identificationPercentage: quiz.identificationPercentage,
    essayPercentage: quiz.essayPercentage,
    computationalPercentage: quiz.computationalPercentage,
    mcqCount: quiz.mcqCount,
    identificationCount: quiz.identificationCount,
    essayCount: quiz.essayCount,
    computationalCount: quiz.computationalCount,
  });

  const answeredByType = {
    MULTIPLE_CHOICE: 0,
    IDENTIFICATION: 0,
    ESSAY: 0,
    COMPUTATIONAL: 0,
  };

  for (const answer of answered) {
    answeredByType[answer.question.questionType] += 1;
  }

  return {
    MULTIPLE_CHOICE: Math.max(
      0,
      targetCounts.MULTIPLE_CHOICE - answeredByType.MULTIPLE_CHOICE
    ),
    IDENTIFICATION: Math.max(
      0,
      targetCounts.IDENTIFICATION - answeredByType.IDENTIFICATION
    ),
    ESSAY: Math.max(0, targetCounts.ESSAY - answeredByType.ESSAY),
    COMPUTATIONAL: Math.max(
      0,
      targetCounts.COMPUTATIONAL - answeredByType.COMPUTATIONAL
    ),
  };
}

/**
 * RULE-BASED ADAPTIVE ASSESSMENT LOGIC
 *
 * Correct + within threshold -> move up
 * Incorrect or slow -> move down
 * No previous answer -> start around MEDIUM
 * Manual essay -> keep current difficulty
 *
 * The returned array is the search priority for the next question difficulty.
 */
function getAdaptiveDifficultySearchOrder(
  lastAnswer: EngineAnswered | null
): Difficulty[] {
  if (!lastAnswer) {
    return ["MEDIUM", "EASY", "HARD"];
  }

  const current = lastAnswer.question.difficulty;

  const isManualEssay =
    lastAnswer.question.questionType === "ESSAY" &&
    lastAnswer.question.correctAnswer === null;

  if (isManualEssay) {
    if (current === "EASY") return ["EASY", "MEDIUM", "HARD"];
    if (current === "MEDIUM") return ["MEDIUM", "EASY", "HARD"];
    return ["HARD", "MEDIUM", "EASY"];
  }

  const isFastEnough =
    lastAnswer.responseTimeSeconds <= lastAnswer.question.timeThresholdSeconds;

  const shouldMoveUp = lastAnswer.isCorrect && isFastEnough;

  if (shouldMoveUp) {
    if (current === "EASY") {
      return ["MEDIUM", "HARD", "EASY"];
    }

    if (current === "MEDIUM") {
      return ["HARD", "MEDIUM", "EASY"];
    }

    return ["HARD", "MEDIUM", "EASY"];
  }

  // Wrong or slow: explicitly search downward first.
  if (current === "HARD") {
    return ["MEDIUM", "EASY", "HARD"];
  }

  if (current === "MEDIUM") {
    return ["EASY", "MEDIUM", "HARD"];
  }

  return ["EASY", "MEDIUM", "HARD"];
}

function pickFromPool(
  pool: EngineQuestion[],
  historicalQuestionIds: Set<string>,
  avoidRepeatedQuestions: boolean
) {
  if (pool.length === 0) return null;

  if (!avoidRepeatedQuestions) {
    return shuffle(pool)[0] ?? null;
  }

  const fresh = pool.filter((question) => !historicalQuestionIds.has(question.id));
  if (fresh.length > 0) {
    return shuffle(fresh)[0] ?? null;
  }

  return shuffle(pool)[0] ?? null;
}

export function getNextQuestionForAttempt(args: {
  quiz: EngineQuiz;
  answered: EngineAnswered[];
  historicalQuestionIds?: string[];
}) {
  const { quiz, answered, historicalQuestionIds = [] } = args;

  const totalNeeded = getTotalQuestionsForAttempt(quiz);
  if (answered.length >= totalNeeded) {
    return null;
  }

  const answeredSet = new Set(answered.map((answer) => answer.questionId));
  const historicalSet = new Set(historicalQuestionIds);

  const remainingTypeCounts = getRemainingTypeCounts(quiz, answered);
  const allowedTypes = QUESTION_TYPE_ORDER.filter(
    (type) => remainingTypeCounts[type] > 0
  );

  const candidatePool = quiz.questions.filter(
    (question) =>
      !answeredSet.has(question.id) &&
      allowedTypes.includes(question.questionType)
  );

  if (candidatePool.length === 0) {
    return null;
  }

  if (!quiz.adaptiveMode) {
    return pickFromPool(candidatePool, historicalSet, quiz.avoidRepeatedQuestions);
  }

  const lastAnswer = answered.length > 0 ? answered[answered.length - 1] : null;
  const difficultyOrder = getAdaptiveDifficultySearchOrder(lastAnswer);

  for (const difficulty of difficultyOrder) {
    const difficultyPool = candidatePool.filter(
      (question) => question.difficulty === difficulty
    );

    const picked = pickFromPool(
      difficultyPool,
      historicalSet,
      quiz.avoidRepeatedQuestions
    );

    if (picked) {
      return picked;
    }
  }

  return pickFromPool(candidatePool, historicalSet, quiz.avoidRepeatedQuestions);
}

export function calculateAttemptScore(answered: EngineAnswered[]) {
  const autoGraded = answered.filter(
    (answer) =>
      !(
        answer.question.questionType === "ESSAY" &&
        answer.question.correctAnswer === null
      )
  );

  if (autoGraded.length === 0) {
    return 0;
  }

  const correct = autoGraded.filter((answer) => answer.isCorrect).length;
  return (correct / autoGraded.length) * 100;
}