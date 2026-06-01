// ─── RSP Core Types ───────────────────────────────────────────────────────────
// Canonical type definitions for the Respectful Synchronised Protocol.
// All modules import from here — never define types locally in modules.

// ── Visual States ─────────────────────────────────────────────────────────────

export type RSPVisualState =
  | 'dormant'
  | 'aware'
  | 'active'
  | 'resonant'
  | 'friction'
  | 'overload'
  | 'drop_off'
  | 'support_needed'
  | 'cooling'
  | 'converting'
  | 'mastery'
  | 'coordination_degraded'
  | 'coordination_healthy'

// ── Event Types ───────────────────────────────────────────────────────────────

export type RSPEventType =
  | 'pageView'
  | 'scroll50'
  | 'scroll90'
  | 'elementClick'
  | 'activeMinute'
  | 'formInteraction'
  | 'resourceDownload'
  | 'returnVisit'
  | 'completionOrConversion'
  | 'humanCorrection'
  | 'agentHandoff'
  | 'safetyEscalation'
  | 'quizRetry'
  | 'videoRewind'
  | (string & {}) // allow custom event types

// ── Source Status ─────────────────────────────────────────────────────────────

export type RSPSourceStatus =
  | 'raw'           // not yet processed
  | 'normalised'    // PII stripped, ready for weighting
  | 'pending-burn'  // processed, awaiting burn
  | 'burned'        // identifiable source destroyed

// ── Burn Method ───────────────────────────────────────────────────────────────

export type RSPBurnMethod =
  | 'deletion'            // record permanently deleted
  | 'anonymisation'       // identifying fields replaced
  | 'cryptographic-erasure' // encryption key destroyed
  | 'irreversible-decoupling' // source link severed

// ── Consent ───────────────────────────────────────────────────────────────────

export type RSPConsentScope =
  | 'coordination'    // basic coordination signals
  | 'learning'        // learning progress signals
  | 'support'         // support and escalation signals
  | 'analytics'       // product analytics signals
  | 'full'            // all signal types
  | (string & {})     // custom scope

export interface RSPConsent {
  /** Unique identifier for this consent record */
  id: string
  /** Subject this consent applies to — anonymised node ID */
  nodeId: string
  /** What signal types this consent covers */
  scope: RSPConsentScope[]
  /** ISO 8601 timestamp when consent was granted */
  grantedAt: string
  /** ISO 8601 timestamp when consent expires — undefined = no expiry */
  expiresAt?: string
  /** Whether this consent is currently active */
  active: boolean
}

// ── Raw Event ─────────────────────────────────────────────────────────────────

export interface RSPRawEvent {
  /** Anonymised node identifier — never a real user ID */
  nodeId: string
  /** Type of event */
  eventType: RSPEventType
  /** ISO 8601 timestamp */
  timestamp: string
  /** Optional additional context — must contain no PII */
  context?: Record<string, unknown>
}

// ── Normalised Event ──────────────────────────────────────────────────────────

export interface RSPNormalisedEvent {
  nodeId: string
  nodeType: string
  eventType: RSPEventType
  /** Numerical weight assigned to this event */
  weight: number
  /** Duration in minutes for the signal accumulation window */
  signalWindowMinutes: number
  /** ISO 8601 timestamp — may be generalised to window bucket */
  timestamp: string
  /** Current source status */
  sourceStatus: RSPSourceStatus
}

// ── Node Signal ───────────────────────────────────────────────────────────────

export interface RSPNodeSignal {
  nodeId: string
  nodeType: string
  /** Current visual state */
  state: RSPVisualState
  /** Signal intensity 0–1 within current state */
  intensity: number
  /** Direction of change */
  trend: 'rising' | 'stable' | 'falling'
  /** Signal window in minutes */
  signalWindowMinutes: number
  /** ISO 8601 start of current window */
  windowStart: string
  /** ISO 8601 end of current window */
  windowEnd: string
  /** Source status — should be 'burned' in any downstream signal */
  sourceStatus: RSPSourceStatus
  /** Accumulated weighted score for this window */
  score: number
  /** Number of events contributing to this signal */
  eventCount: number
}

// ── Burn Receipt ──────────────────────────────────────────────────────────────

export interface RSPBurnReceipt {
  /** Unique receipt identifier */
  id: string
  /** Node the burn applies to */
  nodeId: string
  /** Method used to burn the source */
  method: RSPBurnMethod
  /** ISO 8601 timestamp of burn */
  burnedAt: string
  /** Number of source records destroyed */
  recordCount: number
  /** Signal window that triggered the burn */
  signalWindowMinutes: number
  /** Optional: hash of destroyed data for audit trail */
  dataHash?: string
}

// ── Weight Map ────────────────────────────────────────────────────────────────

export type RSPWeightMap = Partial<Record<RSPEventType, number>> & {
  [key: string]: number
}

// ── Pipeline Config ───────────────────────────────────────────────────────────

export interface RSPConfig {
  /** Default signal window in minutes */
  defaultSignalWindowMinutes: number
  /** Default node type label */
  defaultNodeType: string
  /** Custom weight overrides — merged with defaults */
  weights?: RSPWeightMap
  /** Burn method to use */
  burnMethod?: RSPBurnMethod
}
