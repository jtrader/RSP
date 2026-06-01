import type {
  RSPNodeSignal,
  RSPBurnReceipt,
  RSPBurnMethod,
} from '../types.js'
import type { AggregationEntry } from '../aggregator/index.js'

// ── Burn ──────────────────────────────────────────────────────────────────────
// RSP Steps 7 & 8: Expire the signal and burn the identifiable source.
//
// The burn module marks signals as burned and generates receipts.
// Actual deletion of source records happens in your storage layer —
// this module provides the interface, receipts, and helpers.

let receiptCounter = 0

function generateReceiptId(): string {
  receiptCounter++
  return `burn_${Date.now()}_${receiptCounter.toString().padStart(4, '0')}`
}

/**
 * Mark a node signal as burned.
 * Returns a new signal object with sourceStatus 'burned'.
 * Does not mutate the original.
 */
export function markBurned(signal: RSPNodeSignal): RSPNodeSignal {
  return { ...signal, sourceStatus: 'burned' }
}

/**
 * Generate a burn receipt for an aggregation entry.
 * The receipt is your audit trail — store it, the source records are gone.
 */
export function generateBurnReceipt(
  entry: AggregationEntry,
  method: RSPBurnMethod = 'deletion',
  dataHash?: string,
): RSPBurnReceipt {
  return {
    id: generateReceiptId(),
    nodeId: entry.nodeId,
    method,
    burnedAt: new Date().toISOString(),
    recordCount: entry.eventCount,
    signalWindowMinutes: entry.signalWindowMinutes,
    dataHash,
  }
}

/**
 * Check whether a signal window has expired.
 * Once expired, the source must be burned.
 */
export function isWindowExpired(
  windowEnd: string,
  now: Date = new Date(),
): boolean {
  return now >= new Date(windowEnd)
}

/**
 * Get the burn deadline for a signal window.
 * By default, the deadline is the window end — burn on expiry.
 */
export function getBurnDeadline(windowEnd: string): Date {
  return new Date(windowEnd)
}

/**
 * Validate that a burn receipt is well-formed.
 */
export function validateBurnReceipt(receipt: RSPBurnReceipt): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!receipt.id)       errors.push('Receipt must have an id')
  if (!receipt.nodeId)   errors.push('Receipt must have a nodeId')
  if (!receipt.burnedAt) errors.push('Receipt must have a burnedAt timestamp')
  if (receipt.recordCount < 0) errors.push('recordCount must be non-negative')

  const validMethods: RSPBurnMethod[] = [
    'deletion',
    'anonymisation',
    'cryptographic-erasure',
    'irreversible-decoupling',
  ]
  if (!validMethods.includes(receipt.method)) {
    errors.push(`method must be one of: ${validMethods.join(', ')}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Batch burn: mark multiple signals as burned and generate receipts.
 */
export function burnBatch(
  entries: AggregationEntry[],
  method: RSPBurnMethod = 'deletion',
): { signals: RSPNodeSignal[]; receipts: RSPBurnReceipt[] } {
  const receipts: RSPBurnReceipt[] = []
  const signals: RSPNodeSignal[] = []

  for (const entry of entries) {
    receipts.push(generateBurnReceipt(entry, method))
    // entries don't have signals yet — caller assembles signals separately
    // this is intentional: burn happens to source data, not to the output signal
  }

  return { signals, receipts }
}
