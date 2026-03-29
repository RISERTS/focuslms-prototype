export type BeiResult = {
  normalizedTimeOnTask: number;
  normalizedCompletionRate: number;
  normalizedInteractionFrequency: number;
  bei: number;
  beiPercent: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function computeBei(args: {
  timeOnTaskSeconds: number;
  completionRate: number;
  interactionCount: number;
  maxTimeOnTaskSeconds: number;
  maxInteractionCount: number;
}): BeiResult {
  const normalizedTimeOnTask =
    args.maxTimeOnTaskSeconds > 0
      ? clamp01(args.timeOnTaskSeconds / args.maxTimeOnTaskSeconds)
      : 0;

  const normalizedCompletionRate = clamp01(args.completionRate);

  const normalizedInteractionFrequency =
    args.maxInteractionCount > 0
      ? clamp01(args.interactionCount / args.maxInteractionCount)
      : 0;

  const bei =
    (normalizedTimeOnTask +
      normalizedCompletionRate +
      normalizedInteractionFrequency) /
    3;

  return {
    normalizedTimeOnTask,
    normalizedCompletionRate,
    normalizedInteractionFrequency,
    bei,
    beiPercent: Number((bei * 100).toFixed(2)),
  };
}