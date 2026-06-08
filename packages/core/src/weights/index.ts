import type { RSPEventType, RSPWeightMap } from '../types.js'

// ── Default Weights (v1.7) ────────────────────────────────────────────────────
// Based on RSP Genesis Protocol v1.7.
// These are starting points — calibrate per deployment and vertical.

export const DEFAULT_WEIGHTS: RSPWeightMap = {
  pageView:               1,
  scroll50:               3,
  scroll90:               5,
  elementClick:           8,
  quizRetry:              8,
  agentHandoff:           10,
  activeMinute:           10,
  formInteraction:        12,
  humanCorrection:        12,
  resourceDownload:       15,
  returnVisit:            20,
  safetyEscalation:       20,
  completionOrConversion: 25,
  videoRewind:            6,
}

/**
 * Merge custom weights with defaults.
 * Custom values override defaults; all other defaults are preserved.
 */
export function mergeWeights(custom?: RSPWeightMap): RSPWeightMap {
  if (!custom) return { ...DEFAULT_WEIGHTS }
  return { ...DEFAULT_WEIGHTS, ...custom }
}

/**
 * Get the weight for a specific event type.
 * Returns 0 for unknown event types — unknown events are not weighted.
 */
export function getWeight(
  eventType: RSPEventType,
  weights: RSPWeightMap = DEFAULT_WEIGHTS,
): number {
  return (weights[eventType] as number | undefined) ?? 0
}

/**
 * Validate a weight map — all values must be non-negative numbers.
 */
export function validateWeights(weights: RSPWeightMap): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  for (const [key, value] of Object.entries(weights)) {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`Weight for "${key}" must be a number`)
    } else if (value < 0) {
      errors.push(`Weight for "${key}" must be non-negative`)
    }
  }
  return { valid: errors.length === 0, errors }
}
