import type {
  RSPRawEvent,
  RSPNormalisedEvent,
  RSPWeightMap,
} from '../types.js'
import { getWeight, DEFAULT_WEIGHTS } from '../weights/index.js'

// ── Translator ────────────────────────────────────────────────────────────────
// RSP Steps 3 & 4: Normalise the event and apply weight.
// This is the last point in the pipeline where the full source record exists.
// PII must be stripped before or during this step.

export interface TranslateOptions {
  nodeType?: string
  signalWindowMinutes?: number
  weights?: RSPWeightMap
  /** Generalise timestamp to window bucket (recommended for privacy) */
  bucketTimestamp?: boolean
}

/**
 * Translate a raw event into a normalised RSP event.
 * Strips any context fields, applies weight, and marks source as normalised.
 *
 * The nodeId in the raw event must already be anonymised before calling this.
 * Never pass a real user ID as nodeId.
 */
export function translate(
  event: RSPRawEvent,
  options: TranslateOptions = {},
): RSPNormalisedEvent {
  const {
    nodeType = 'element',
    signalWindowMinutes = 60,
    weights = DEFAULT_WEIGHTS,
    bucketTimestamp = true,
  } = options

  const weight = getWeight(event.eventType, weights)

  const timestamp = bucketTimestamp
    ? bucketToWindow(event.timestamp, signalWindowMinutes)
    : event.timestamp

  return {
    nodeId: event.nodeId,
    nodeType,
    eventType: event.eventType,
    weight,
    signalWindowMinutes,
    timestamp,
    sourceStatus: 'normalised',
  }
}

/**
 * Translate multiple raw events in one pass.
 */
export function translateBatch(
  events: RSPRawEvent[],
  options: TranslateOptions = {},
): RSPNormalisedEvent[] {
  return events.map((e) => translate(e, options))
}

/**
 * Round a timestamp down to the nearest signal window bucket.
 * e.g. 14:22:00 with a 60-minute window → 14:00:00
 * This generalises the timestamp, reducing re-identification risk.
 */
export function bucketToWindow(timestamp: string, windowMinutes: number): string {
  const ms = new Date(timestamp).getTime()
  const windowMs = windowMinutes * 60 * 1000
  const bucketed = Math.floor(ms / windowMs) * windowMs
  return new Date(bucketed).toISOString()
}
