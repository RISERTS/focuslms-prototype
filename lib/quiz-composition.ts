export type QuizType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL"
  | "MIXED";

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "IDENTIFICATION"
  | "ESSAY"
  | "COMPUTATIONAL";

export type QuizCompositionMode = "NONE" | "PERCENTAGE" | "COUNT";

export type CompositionCounts = {
  MULTIPLE_CHOICE: number;
  IDENTIFICATION: number;
  ESSAY: number;
  COMPUTATIONAL: number;
};

type CompositionInput = {
  quizType: QuizType;
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
};

type QuestionLite = {
  id: string;
  questionType: QuestionType;
};

const QUESTION_TYPE_ORDER: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "IDENTIFICATION",
  "ESSAY",
  "COMPUTATIONAL",
];

function emptyCounts(): CompositionCounts {
  return {
    MULTIPLE_CHOICE: 0,
    IDENTIFICATION: 0,
    ESSAY: 0,
    COMPUTATIONAL: 0,
  };
}

function toNonNegativeInt(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function allocateByWeights(
  total: number,
  weights: Partial<Record<QuestionType, number>>
): CompositionCounts {
  const result = emptyCounts();

  if (total <= 0) {
    return result;
  }

  const normalizedWeights = QUESTION_TYPE_ORDER.map((key) => ({
    key,
    weight: Math.max(0, Number(weights[key] ?? 0)),
  }));

  const totalWeight = normalizedWeights.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  if (totalWeight <= 0) {
    return result;
  }

  const raw = normalizedWeights.map((item) => ({
    key: item.key,
    raw: (total * item.weight) / totalWeight,
  }));

  for (const item of raw) {
    result[item.key] = Math.floor(item.raw);
  }

  const used = QUESTION_TYPE_ORDER.reduce((sum, key) => sum + result[key], 0);
  let remaining = total - used;

  const sortedRemainders = raw
    .map((item) => ({
      key: item.key,
      remainder: item.raw - Math.floor(item.raw),
    }))
    .sort((a, b) => {
      if (b.remainder !== a.remainder) {
        return b.remainder - a.remainder;
      }

      return QUESTION_TYPE_ORDER.indexOf(a.key) - QUESTION_TYPE_ORDER.indexOf(b.key);
    });

  let index = 0;
  while (remaining > 0 && sortedRemainders.length > 0) {
    const target = sortedRemainders[index % sortedRemainders.length];
    result[target.key] += 1;
    remaining -= 1;
    index += 1;
  }

  return result;
}

function distributeEqually(
  total: number,
  keys: QuestionType[]
): CompositionCounts {
  const result = emptyCounts();

  if (total <= 0 || keys.length === 0) {
    return result;
  }

  const base = Math.floor(total / keys.length);
  let remainder = total % keys.length;

  for (const key of keys) {
    result[key] = base;
  }

  for (let i = 0; i < keys.length && remainder > 0; i += 1) {
    result[keys[i]] += 1;
    remainder -= 1;
  }

  return result;
}

export function validateQuizComposition(input: CompositionInput): string | null {
  const questionsPerAttempt = input.questionsPerAttempt;

  const mcqPercentage = toNonNegativeInt(input.mcqPercentage);
  const identificationPercentage = toNonNegativeInt(input.identificationPercentage);
  const essayPercentage = toNonNegativeInt(input.essayPercentage);
  const computationalPercentage = toNonNegativeInt(input.computationalPercentage);

  const mcqCount = toNonNegativeInt(input.mcqCount);
  const identificationCount = toNonNegativeInt(input.identificationCount);
  const essayCount = toNonNegativeInt(input.essayCount);
  const computationalCount = toNonNegativeInt(input.computationalCount);

  if (input.quizType !== "MIXED") {
    return null;
  }

  if (input.compositionMode !== "PERCENTAGE" && input.compositionMode !== "COUNT") {
    return "Mixed quizzes require a composition mode.";
  }

  if (input.compositionMode === "PERCENTAGE") {
    if (!questionsPerAttempt || questionsPerAttempt <= 0) {
      return "Questions per attempt is required for percentage-based mixed quizzes.";
    }

    const totalPercentage =
      mcqPercentage +
      identificationPercentage +
      essayPercentage +
      computationalPercentage;

    const zeroFieldCount = [
      mcqPercentage,
      identificationPercentage,
      essayPercentage,
      computationalPercentage,
    ].filter((value) => value === 0).length;

    if (totalPercentage > 100) {
      return "Mixed quiz percentages cannot exceed 100.";
    }

    if (totalPercentage < 100 && zeroFieldCount === 0) {
      return "If the total percentage is below 100, leave at least one field at 0% so the remaining items can be auto-distributed.";
    }
  }

  if (input.compositionMode === "COUNT") {
    const totalCount =
      mcqCount + identificationCount + essayCount + computationalCount;

    if (totalCount <= 0) {
      return "At least one question count is required for count-based mixed quizzes.";
    }

    if (
      questionsPerAttempt &&
      questionsPerAttempt > 0 &&
      totalCount !== questionsPerAttempt
    ) {
      return "For count-based mixed quizzes, the total per-type counts must match questions per attempt.";
    }
  }

  return null;
}

export function getMixedCompositionCounts(input: CompositionInput): CompositionCounts {
  if (input.quizType !== "MIXED") {
    return emptyCounts();
  }

  if (input.compositionMode !== "PERCENTAGE" && input.compositionMode !== "COUNT") {
    return emptyCounts();
  }

  if (input.compositionMode === "COUNT") {
    return {
      MULTIPLE_CHOICE: toNonNegativeInt(input.mcqCount),
      IDENTIFICATION: toNonNegativeInt(input.identificationCount),
      ESSAY: toNonNegativeInt(input.essayCount),
      COMPUTATIONAL: toNonNegativeInt(input.computationalCount),
    };
  }

  const total = input.questionsPerAttempt ?? 0;

  if (total <= 0) {
    return emptyCounts();
  }

  const percentages: CompositionCounts = {
    MULTIPLE_CHOICE: toNonNegativeInt(input.mcqPercentage),
    IDENTIFICATION: toNonNegativeInt(input.identificationPercentage),
    ESSAY: toNonNegativeInt(input.essayPercentage),
    COMPUTATIONAL: toNonNegativeInt(input.computationalPercentage),
  };

  const explicitKeys = QUESTION_TYPE_ORDER.filter((key) => percentages[key] > 0);
  const autoKeys = QUESTION_TYPE_ORDER.filter((key) => percentages[key] === 0);

  const explicitPercentageTotal = QUESTION_TYPE_ORDER.reduce(
    (sum, key) => sum + percentages[key],
    0
  );

  if (explicitPercentageTotal > 100) {
    return emptyCounts();
  }

  if (explicitPercentageTotal === 100) {
    return allocateByWeights(total, percentages);
  }

  const reservedForExplicit = Math.floor((total * explicitPercentageTotal) / 100);

  const explicitCounts =
    explicitKeys.length > 0
      ? allocateByWeights(
          reservedForExplicit,
          explicitKeys.reduce(
            (acc, key) => {
              acc[key] = percentages[key];
              return acc;
            },
            {} as Partial<Record<QuestionType, number>>
          )
        )
      : emptyCounts();

  const remainingItems = total - reservedForExplicit;

  const autoCounts = distributeEqually(remainingItems, autoKeys);

  return {
    MULTIPLE_CHOICE:
      explicitCounts.MULTIPLE_CHOICE + autoCounts.MULTIPLE_CHOICE,
    IDENTIFICATION:
      explicitCounts.IDENTIFICATION + autoCounts.IDENTIFICATION,
    ESSAY: explicitCounts.ESSAY + autoCounts.ESSAY,
    COMPUTATIONAL:
      explicitCounts.COMPUTATIONAL + autoCounts.COMPUTATIONAL,
  };
}

export function normalizeCompositionForSave(input: CompositionInput) {
  const validationError = validateQuizComposition(input);

  if (validationError) {
    throw new Error(validationError);
  }

  if (input.quizType !== "MIXED") {
    return {
      questionsPerAttempt: input.questionsPerAttempt,
      compositionMode: "NONE" as QuizCompositionMode,
      mcqPercentage: null,
      identificationPercentage: null,
      essayPercentage: null,
      computationalPercentage: null,
      mcqCount: null,
      identificationCount: null,
      essayCount: null,
      computationalCount: null,
    };
  }

  const fixedQuestionsPerAttempt =
    input.compositionMode === "COUNT" &&
    (!input.questionsPerAttempt || input.questionsPerAttempt <= 0)
      ? toNonNegativeInt(input.mcqCount) +
        toNonNegativeInt(input.identificationCount) +
        toNonNegativeInt(input.essayCount) +
        toNonNegativeInt(input.computationalCount)
      : input.questionsPerAttempt;

  return {
    questionsPerAttempt: fixedQuestionsPerAttempt,
    compositionMode: input.compositionMode,
    mcqPercentage:
      input.compositionMode === "PERCENTAGE"
        ? toNonNegativeInt(input.mcqPercentage)
        : null,
    identificationPercentage:
      input.compositionMode === "PERCENTAGE"
        ? toNonNegativeInt(input.identificationPercentage)
        : null,
    essayPercentage:
      input.compositionMode === "PERCENTAGE"
        ? toNonNegativeInt(input.essayPercentage)
        : null,
    computationalPercentage:
      input.compositionMode === "PERCENTAGE"
        ? toNonNegativeInt(input.computationalPercentage)
        : null,
    mcqCount:
      input.compositionMode === "COUNT" ? toNonNegativeInt(input.mcqCount) : null,
    identificationCount:
      input.compositionMode === "COUNT"
        ? toNonNegativeInt(input.identificationCount)
        : null,
    essayCount:
      input.compositionMode === "COUNT" ? toNonNegativeInt(input.essayCount) : null,
    computationalCount:
      input.compositionMode === "COUNT"
        ? toNonNegativeInt(input.computationalCount)
        : null,
  };
}

export function selectQuestionsForAttempt(args: {
  quiz: CompositionInput & {
    avoidRepeatedQuestions: boolean;
  };
  questions: QuestionLite[];
  previousQuestionIds?: string[];
}) {
  const { quiz, questions, previousQuestionIds = [] } = args;
  const previousSet = new Set(previousQuestionIds);

  if (quiz.quizType !== "MIXED") {
    const filteredByType = questions.filter(
      (question) => question.questionType === quiz.quizType
    );

    const targetCount = quiz.questionsPerAttempt ?? filteredByType.length;

    const unused = shuffle(
      filteredByType.filter((question) => !previousSet.has(question.id))
    );
    const used = shuffle(
      filteredByType.filter((question) => previousSet.has(question.id))
    );

    const selected = quiz.avoidRepeatedQuestions
      ? [...unused, ...used].slice(0, targetCount)
      : shuffle(filteredByType).slice(0, targetCount);

    if (selected.length < targetCount) {
      throw new Error("Not enough questions available for this quiz.");
    }

    return shuffle(selected);
  }

  const counts = getMixedCompositionCounts(quiz);
  const result: QuestionLite[] = [];

  for (const questionType of QUESTION_TYPE_ORDER) {
    const required = counts[questionType];

    if (required <= 0) continue;

    const pool = questions.filter(
      (question) => question.questionType === questionType
    );

    if (pool.length < required) {
      throw new Error(
        `Not enough ${questionType} questions available for the mixed quiz configuration.`
      );
    }

    const unused = shuffle(
      pool.filter((question) => !previousSet.has(question.id))
    );
    const used = shuffle(
      pool.filter((question) => previousSet.has(question.id))
    );

    const selected = quiz.avoidRepeatedQuestions
      ? [...unused, ...used].slice(0, required)
      : shuffle(pool).slice(0, required);

    if (selected.length < required) {
      throw new Error(
        `Unable to select enough ${questionType} questions for this attempt.`
      );
    }

    result.push(...selected);
  }

  return shuffle(result);
}