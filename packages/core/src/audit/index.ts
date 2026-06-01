import type { RSPBurnReceipt, RSPNodeSignal } from '../types.js'

// ── Audit ─────────────────────────────────────────────────────────────────────
// Produces burn receipts and process proof for RSP compliance verification.
// The audit trail proves the burn happened — without containing the burned data.

export interface RSPAuditLog {
  protocol: 'RSP'
  version: string
  generatedAt: string
  receipts: RSPBurnReceipt[]
  summary: RSPAuditSummary
}

export interface RSPAuditSummary {
  totalBurns: number
  totalRecordsDestroyed: number
  methodBreakdown: Record<string, number>
  earliestBurn: string | null
  latestBurn: string | null
}

/**
 * Generate an audit log from a collection of burn receipts.
 */
export function generateAuditLog(
  receipts: RSPBurnReceipt[],
  version = '1.7',
): RSPAuditLog {
  return {
    protocol: 'RSP',
    version,
    generatedAt: new Date().toISOString(),
    receipts,
    summary: summariseReceipts(receipts),
  }
}

/**
 * Summarise a collection of burn receipts.
 */
export function summariseReceipts(receipts: RSPBurnReceipt[]): RSPAuditSummary {
  if (receipts.length === 0) {
    return {
      totalBurns: 0,
      totalRecordsDestroyed: 0,
      methodBreakdown: {},
      earliestBurn: null,
      latestBurn: null,
    }
  }

  const methodBreakdown: Record<string, number> = {}
  let totalRecords = 0
  const timestamps = receipts.map((r) => r.burnedAt).sort()

  for (const receipt of receipts) {
    methodBreakdown[receipt.method] = (methodBreakdown[receipt.method] ?? 0) + 1
    totalRecords += receipt.recordCount
  }

  return {
    totalBurns: receipts.length,
    totalRecordsDestroyed: totalRecords,
    methodBreakdown,
    earliestBurn: timestamps[0] ?? null,
    latestBurn: timestamps[timestamps.length - 1] ?? null,
  }
}

/**
 * Verify that all signals in a set have been burned.
 * Returns any signals that are still pending burn.
 */
export function verifyBurnCoverage(
  signals: RSPNodeSignal[],
  receipts: RSPBurnReceipt[],
): { allBurned: boolean; unburnedNodeIds: string[] } {
  const burnedNodeIds = new Set(receipts.map((r) => r.nodeId))
  const unburnedNodeIds = signals
    .filter((s) => s.sourceStatus !== 'burned' && !burnedNodeIds.has(s.nodeId))
    .map((s) => s.nodeId)

  return {
    allBurned: unburnedNodeIds.length === 0,
    unburnedNodeIds,
  }
}

/**
 * Format an audit log as a human-readable string.
 * Suitable for logging or inclusion in compliance reports.
 */
export function formatAuditLog(log: RSPAuditLog): string {
  const lines = [
    `RSP Audit Log — v${log.version}`,
    `Generated: ${log.generatedAt}`,
    ``,
    `Summary`,
    `  Total burns:            ${log.summary.totalBurns}`,
    `  Total records destroyed: ${log.summary.totalRecordsDestroyed}`,
    `  Earliest burn:          ${log.summary.earliestBurn ?? 'n/a'}`,
    `  Latest burn:            ${log.summary.latestBurn ?? 'n/a'}`,
    ``,
    `Method breakdown`,
    ...Object.entries(log.summary.methodBreakdown).map(
      ([method, count]) => `  ${method}: ${count}`,
    ),
  ]
  return lines.join('\n')
}
