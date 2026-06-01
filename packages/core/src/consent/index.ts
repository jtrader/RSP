import type { RSPConsent, RSPConsentScope } from '../types.js'

// ── Consent ───────────────────────────────────────────────────────────────────
// RSP Step 2: Check consent before processing any event.
// No signal without a valid consent basis.

/**
 * Check whether a consent record is currently valid for a given scope.
 * Returns true only if:
 *  - consent exists
 *  - consent is active
 *  - consent has not expired
 *  - consent covers the requested scope
 */
export function hasConsent(
  consent: RSPConsent | undefined | null,
  requiredScope: RSPConsentScope,
  now: Date = new Date(),
): boolean {
  if (!consent) return false
  if (!consent.active) return false

  if (consent.expiresAt) {
    const expiry = new Date(consent.expiresAt)
    if (now >= expiry) return false
  }

  return (
    consent.scope.includes('full') ||
    consent.scope.includes(requiredScope)
  )
}

/**
 * Check whether a consent record has expired.
 */
export function isExpired(
  consent: RSPConsent,
  now: Date = new Date(),
): boolean {
  if (!consent.expiresAt) return false
  return now >= new Date(consent.expiresAt)
}

/**
 * Create a new consent record.
 */
export function createConsent(params: {
  id: string
  nodeId: string
  scope: RSPConsentScope[]
  durationDays?: number
}): RSPConsent {
  const now = new Date()
  const expiresAt = params.durationDays
    ? new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined

  return {
    id: params.id,
    nodeId: params.nodeId,
    scope: params.scope,
    grantedAt: now.toISOString(),
    expiresAt,
    active: true,
  }
}

/**
 * Withdraw consent — returns a new consent object with active: false.
 * Does not mutate the original.
 */
export function withdrawConsent(consent: RSPConsent): RSPConsent {
  return { ...consent, active: false }
}

/**
 * Scope to signal type mapping — which consent scope covers which event types.
 */
export const SCOPE_MAP: Record<RSPConsentScope, string[]> = {
  coordination:  ['agentHandoff', 'humanCorrection', 'safetyEscalation'],
  learning:      ['pageView', 'scroll50', 'scroll90', 'activeMinute', 'videoRewind', 'quizRetry', 'completionOrConversion'],
  support:       ['safetyEscalation', 'agentHandoff', 'humanCorrection'],
  analytics:     ['pageView', 'scroll50', 'scroll90', 'elementClick', 'formInteraction', 'resourceDownload', 'returnVisit', 'completionOrConversion'],
  full:          ['*'],
}
