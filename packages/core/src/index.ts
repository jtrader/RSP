// ── @rsp/core ─────────────────────────────────────────────────────────────────
// Respectful Synchronised Protocol — core pipeline
// https://github.com/jtrader/RSP

// Types
export type {
  RSPVisualState,
  RSPEventType,
  RSPSourceStatus,
  RSPBurnMethod,
  RSPConsentScope,
  RSPConsent,
  RSPRawEvent,
  RSPNormalisedEvent,
  RSPNodeSignal,
  RSPBurnReceipt,
  RSPWeightMap,
  RSPConfig,
} from './types.js'

// Tracker
export { RSPTracker, createTracker } from './tracker/index.js'
export type { TrackerOptions, TrackerEvent, EventHandler } from './tracker/index.js'

// Consent
export {
  hasConsent,
  isExpired,
  createConsent,
  withdrawConsent,
  SCOPE_MAP,
} from './consent/index.js'

// Weights
export {
  DEFAULT_WEIGHTS,
  mergeWeights,
  getWeight,
  validateWeights,
} from './weights/index.js'

// Translator
export {
  translate,
  translateBatch,
  bucketToWindow,
} from './translator/index.js'
export type { TranslateOptions } from './translator/index.js'

// Aggregator
export {
  aggregate,
  toNodeSignal,
  scoreToState,
  scoreToIntensity,
  scoreTrend,
  DEFAULT_THRESHOLDS,
} from './aggregator/index.js'
export type {
  AggregationEntry,
  StateThresholds,
} from './aggregator/index.js'

// Burn
export {
  markBurned,
  generateBurnReceipt,
  isWindowExpired,
  getBurnDeadline,
  validateBurnReceipt,
  burnBatch,
} from './burn/index.js'

// Audit
export {
  generateAuditLog,
  summariseReceipts,
  verifyBurnCoverage,
  formatAuditLog,
} from './audit/index.js'
export type { RSPAuditLog, RSPAuditSummary } from './audit/index.js'

// Visualizer
export {
  STATE_DISPLAY,
  getStateDisplay,
  renderSignal,
  renderSignals,
  filterByState,
  getAttentionSignals,
} from './visualizer/index.js'
export type { RSPStateDisplay, RSPSignalDisplay } from './visualizer/index.js'
