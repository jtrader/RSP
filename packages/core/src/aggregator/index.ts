import type {
  RSPNormalisedEvent,
  RSPNodeSignal,
  RSPVisualState,
} from '../types.js'

// ── Aggregator ────────────────────────────────────────────────────────────────
// RSP Steps 5 & 6: Aggregate weighted events to a node signal score,
// then map the score to a visual state.
//
// The visual state is what downstream systems act on.
// There is no user in the output — only a state, a direction, and a window.

// ── State Thresholds ──────────────────────────────────────────────────────────
// Thresholds map accumulated scores to visual states.
// These defaults are for a 60-minute window — adjust per vertical and window size.

export interface StateThresholds {
  dormant: number       // 0 – threshold
  aware: number         // threshold – x
  active: number
  resonant: number
  overload: number      // above this = overload
  friction?: number     // triggered by pattern, not score alone
  support_needed?: number
}

export const DEFAULT_THRESHOLDS: StateThresholds = {
  dormant:  0,
  aware:    5,
  active:   20,
  resonant: 50,
  overload: 150,
}

// ── Aggregation Store Entry ───────────────────────────────────────────────────

export interface AggregationEntry {
  nodeId: string
  nodeType: string
  score: number
  eventCount: number
  windowStart: string
  windowEnd: string
  signalWindowMinutes: number
  events: RSPNormalisedEvent[]
}

/**
 * Accumulate a batch of normalised events into an aggregation entry.
 * Groups by nodeId and sums weights within the signal window.
 */
export function aggregate(
  events: RSPNormalisedEvent[],
  windowStart: Date = new Date(),
): Map<string, AggregationEntry> {
  const entries = new Map<string, AggregationEntry>()

  for (const event of events) {
    const existing = entries.get(event.nodeId)
    const windowMs = event.signalWindowMinutes * 60 * 1000
    const windowEnd = new Date(windowStart.getTime() + windowMs)

    if (existing) {
      existing.score += event.weight
      existing.eventCount += 1
      existing.events.push(event)
    } else {
      entries.set(event.nodeId, {
        nodeId: event.nodeId,
        nodeType: event.nodeType,
        score: event.weight,
        eventCount: 1,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        signalWindowMinutes: event.signalWindowMinutes,
        events: [event],
      })
    }
  }

  return entries
}

/**
 * Map an aggregation entry to an RSP node signal.
 * This is the output of the pipeline — no source data, just state.
 */
export function toNodeSignal(
  entry: AggregationEntry,
  thresholds: StateThresholds = DEFAULT_THRESHOLDS,
  previousScore?: number,
): RSPNodeSignal {
  const state = scoreToState(entry.score, entry.events, thresholds)
  const intensity = scoreToIntensity(entry.score, thresholds)
  const trend = scoreTrend(entry.score, previousScore)

  return {
    nodeId: entry.nodeId,
    nodeType: entry.nodeType,
    state,
    intensity,
    trend,
    signalWindowMinutes: entry.signalWindowMinutes,
    windowStart: entry.windowStart,
    windowEnd: entry.windowEnd,
    sourceStatus: 'pending-burn',
    score: entry.score,
    eventCount: entry.eventCount,
  }
}

/**
 * Map a score to a visual state.
 * Friction and support_needed are pattern-based, not score-based.
 */
export function scoreToState(
  score: number,
  events: RSPNormalisedEvent[],
  thresholds: StateThresholds = DEFAULT_THRESHOLDS,
): RSPVisualState {
  // pattern detection takes priority over score
  if (hasSafetyEscalation(events)) return 'support_needed'
  if (hasFrictionPattern(events))  return 'friction'
  if (hasDropOffPattern(events))   return 'drop_off'
  if (hasConversionPattern(events)) return 'converting'

  // score-based states
  if (score <= 0)                        return 'dormant'
  if (score < thresholds.aware)          return 'dormant'
  if (score < thresholds.active)         return 'aware'
  if (score < thresholds.resonant)       return 'active'
  if (score >= thresholds.overload)      return 'overload'
  return 'resonant'
}

/**
 * Normalise score to an intensity value between 0 and 1.
 */
export function scoreToIntensity(
  score: number,
  thresholds: StateThresholds = DEFAULT_THRESHOLDS,
): number {
  const max = thresholds.overload
  return Math.min(Math.max(score / max, 0), 1)
}

/**
 * Determine trend by comparing current score to previous window score.
 */
export function scoreTrend(
  current: number,
  previous?: number,
): 'rising' | 'stable' | 'falling' {
  if (previous === undefined) return 'stable'
  const delta = current - previous
  if (delta > 5)  return 'rising'
  if (delta < -5) return 'falling'
  return 'stable'
}

// ── Pattern Detection ─────────────────────────────────────────────────────────

function hasSafetyEscalation(events: RSPNormalisedEvent[]): boolean {
  return events.some((e) => e.eventType === 'safetyEscalation')
}

function hasFrictionPattern(events: RSPNormalisedEvent[]): boolean {
  // friction: 3 or more retries or failed interactions in the window
  const frictionEvents = events.filter((e) =>
    e.eventType === 'quizRetry' || e.eventType === 'videoRewind',
  )
  return frictionEvents.length >= 3
}

function hasDropOffPattern(events: RSPNormalisedEvent[]): boolean {
  // drop-off: scroll50 present but no scroll90, no active minutes, no completion
  const hasScroll50 = events.some((e) => e.eventType === 'scroll50')
  const hasDeepEngagement = events.some((e) =>
    ['scroll90', 'activeMinute', 'completionOrConversion', 'resourceDownload'].includes(e.eventType),
  )
  return hasScroll50 && !hasDeepEngagement && events.length <= 2
}

function hasConversionPattern(events: RSPNormalisedEvent[]): boolean {
  return events.some((e) => e.eventType === 'completionOrConversion')
}
