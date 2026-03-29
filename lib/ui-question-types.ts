export const USER_VISIBLE_QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "IDENTIFICATION", label: "Identification" },
  { value: "COMPUTATIONAL", label: "Computational" },
] as const;

export const USER_VISIBLE_QUIZ_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "IDENTIFICATION", label: "Identification" },
  { value: "COMPUTATIONAL", label: "Computational" },
  { value: "MIXED", label: "Mixed" },
] as const;

export type UserVisibleQuestionType =
  (typeof USER_VISIBLE_QUESTION_TYPES)[number]["value"];

export type UserVisibleQuizType =
  (typeof USER_VISIBLE_QUIZ_TYPES)[number]["value"];
