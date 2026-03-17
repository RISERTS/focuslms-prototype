function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeByMax(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return clamp(value / maxValue);
}

export function computeBEI(params: {
  timeOnTaskSeconds: number;
  maxTimeOnTaskSeconds: number;
  completionRate: number;
  interactionCount: number;
  maxInteractionCount: number;
}) {
  const nt = normalizeByMax(
    params.timeOnTaskSeconds,
    params.maxTimeOnTaskSeconds
  );
  const ncr = clamp(params.completionRate);
  const nif = normalizeByMax(
    params.interactionCount,
    params.maxInteractionCount
  );

  const bei = (nt + ncr + nif) / 3;

  return {
    nt,
    ncr,
    nif,
    bei,
  };
}