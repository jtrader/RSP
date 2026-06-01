import { describe, test, expect } from "vitest"
import {
  // consent
  hasConsent, createConsent, withdrawConsent, isExpired,
  // weights
  getWeight, mergeWeights, validateWeights, DEFAULT_WEIGHTS,
  // translator
  translate, bucketToWindow,
  // aggregator
  aggregate, toNodeSignal, scoreToState, DEFAULT_THRESHOLDS,
  // burn
  markBurned, generateBurnReceipt, isWindowExpired, validateBurnReceipt,
  // audit
  generateAuditLog, summariseReceipts, verifyBurnCoverage,
  // visualizer
  getStateDisplay, renderSignal, getAttentionSignals,
} from '../src/index.js'

import type {
  RSPConsent,
  RSPRawEvent,
  RSPNormalisedEvent,
  RSPNodeSignal,
} from '../src/index.js'

// ── Consent ───────────────────────────────────────────────────────────────────

describe('consent', () => {
  const validConsent: RSPConsent = createConsent({
    id: 'c1',
    nodeId: 'node-abc',
    scope: ['analytics'],
    durationDays: 30,
  })

  test('hasConsent returns true for valid active consent', () => {
    expect(hasConsent(validConsent, 'analytics')).toBe(true)
  })

  test('hasConsent returns false for null consent', () => {
    expect(hasConsent(null, 'analytics')).toBe(false)
  })

  test('hasConsent returns false for wrong scope', () => {
    expect(hasConsent(validConsent, 'learning')).toBe(false)
  })

  test('hasConsent returns false for withdrawn consent', () => {
    const withdrawn = withdrawConsent(validConsent)
    expect(hasConsent(withdrawn, 'analytics')).toBe(false)
  })

  test('hasConsent returns false for expired consent', () => {
    const expired = createConsent({
      id: 'c2',
      nodeId: 'node-abc',
      scope: ['analytics'],
      durationDays: -1, // already expired
    })
    expect(hasConsent(expired, 'analytics')).toBe(false)
  })

  test('full scope grants access to any scope', () => {
    const fullConsent = createConsent({
      id: 'c3',
      nodeId: 'node-abc',
      scope: ['full'],
    })
    expect(hasConsent(fullConsent, 'learning')).toBe(true)
    expect(hasConsent(fullConsent, 'coordination')).toBe(true)
  })

  test('withdrawConsent does not mutate original', () => {
    const withdrawn = withdrawConsent(validConsent)
    expect(validConsent.active).toBe(true)
    expect(withdrawn.active).toBe(false)
  })
})

// ── Weights ───────────────────────────────────────────────────────────────────

describe('weights', () => {
  test('getWeight returns correct default weight', () => {
    expect(getWeight('pageView')).toBe(1)
    expect(getWeight('completionOrConversion')).toBe(25)
    expect(getWeight('safetyEscalation')).toBe(20)
  })

  test('getWeight returns 0 for unknown event type', () => {
    expect(getWeight('unknownEvent')).toBe(0)
  })

  test('mergeWeights overrides defaults', () => {
    const custom = mergeWeights({ pageView: 5 })
    expect(custom['pageView']).toBe(5)
    expect(custom['activeMinute']).toBe(DEFAULT_WEIGHTS['activeMinute'])
  })

  test('validateWeights rejects negative values', () => {
    const result = validateWeights({ pageView: -1 })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('validateWeights accepts valid weights', () => {
    const result = validateWeights(DEFAULT_WEIGHTS)
    expect(result.valid).toBe(true)
  })
})

// ── Translator ────────────────────────────────────────────────────────────────

describe('translator', () => {
  const rawEvent: RSPRawEvent = {
    nodeId: 'node-abc',
    eventType: 'activeMinute',
    timestamp: '2026-06-01T14:22:00.000Z',
    context: { page: '/lesson-3' },
  }

  test('translate returns normalised event', () => {
    const result = translate(rawEvent)
    expect(result.nodeId).toBe('node-abc')
    expect(result.eventType).toBe('activeMinute')
    expect(result.weight).toBe(10)
    expect(result.sourceStatus).toBe('normalised')
  })

  test('translate strips context', () => {
    const result = translate(rawEvent)
    expect((result as any).context).toBeUndefined()
  })

  test('translate buckets timestamp to window', () => {
    const result = translate(rawEvent, { signalWindowMinutes: 60 })
    expect(result.timestamp).toBe('2026-06-01T14:00:00.000Z')
  })

  test('bucketToWindow rounds down to window start', () => {
    const bucketed = bucketToWindow('2026-06-01T14:37:00.000Z', 60)
    expect(bucketed).toBe('2026-06-01T14:00:00.000Z')
  })

  test('translate applies custom weights', () => {
    const result = translate(rawEvent, { weights: { activeMinute: 99 } })
    expect(result.weight).toBe(99)
  })
})

// ── Aggregator ────────────────────────────────────────────────────────────────

describe('aggregator', () => {
  const events: RSPNormalisedEvent[] = [
    { nodeId: 'node-1', nodeType: 'lesson', eventType: 'pageView',    weight: 1,  signalWindowMinutes: 60, timestamp: '2026-06-01T14:00:00.000Z', sourceStatus: 'normalised' },
    { nodeId: 'node-1', nodeType: 'lesson', eventType: 'activeMinute', weight: 10, signalWindowMinutes: 60, timestamp: '2026-06-01T14:00:00.000Z', sourceStatus: 'normalised' },
    { nodeId: 'node-1', nodeType: 'lesson', eventType: 'scroll90',     weight: 5,  signalWindowMinutes: 60, timestamp: '2026-06-01T14:00:00.000Z', sourceStatus: 'normalised' },
    { nodeId: 'node-2', nodeType: 'lesson', eventType: 'pageView',     weight: 1,  signalWindowMinutes: 60, timestamp: '2026-06-01T14:00:00.000Z', sourceStatus: 'normalised' },
  ]

  test('aggregate groups events by nodeId', () => {
    const result = aggregate(events)
    expect(result.size).toBe(2)
  })

  test('aggregate sums weights correctly', () => {
    const result = aggregate(events)
    expect(result.get('node-1')?.score).toBe(16)
    expect(result.get('node-2')?.score).toBe(1)
  })

  test('toNodeSignal maps score to visual state', () => {
    const entry = aggregate(events).get('node-1')!
    const signal = toNodeSignal(entry)
    expect(signal.state).toBe('aware') // score 16, below active threshold of 20
    expect(signal.sourceStatus).toBe('pending-burn')
  })

  test('scoreToState returns resonant for high score', () => {
    const mockEvents: RSPNormalisedEvent[] = []
    expect(scoreToState(75, mockEvents, DEFAULT_THRESHOLDS)).toBe('resonant')
  })

  test('scoreToState returns support_needed for safety escalation', () => {
    const escalation: RSPNormalisedEvent[] = [
      { nodeId: 'n', nodeType: 't', eventType: 'safetyEscalation', weight: 20, signalWindowMinutes: 60, timestamp: '', sourceStatus: 'normalised' },
    ]
    expect(scoreToState(20, escalation, DEFAULT_THRESHOLDS)).toBe('support_needed')
  })
})

// ── Burn ──────────────────────────────────────────────────────────────────────

describe('burn', () => {
  const mockSignal: RSPNodeSignal = {
    nodeId: 'node-1',
    nodeType: 'lesson',
    state: 'active',
    intensity: 0.5,
    trend: 'stable',
    signalWindowMinutes: 60,
    windowStart: '2026-06-01T14:00:00.000Z',
    windowEnd: '2026-06-01T15:00:00.000Z',
    sourceStatus: 'pending-burn',
    score: 30,
    eventCount: 5,
  }

  test('markBurned sets sourceStatus to burned', () => {
    const burned = markBurned(mockSignal)
    expect(burned.sourceStatus).toBe('burned')
  })

  test('markBurned does not mutate original', () => {
    markBurned(mockSignal)
    expect(mockSignal.sourceStatus).toBe('pending-burn')
  })

  test('isWindowExpired returns true for past window', () => {
    expect(isWindowExpired('2020-01-01T00:00:00.000Z')).toBe(true)
  })

  test('isWindowExpired returns false for future window', () => {
    expect(isWindowExpired('2099-01-01T00:00:00.000Z')).toBe(false)
  })

  test('generateBurnReceipt is valid', () => {
    const entry = {
      nodeId: 'node-1',
      nodeType: 'lesson',
      score: 30,
      eventCount: 5,
      windowStart: '2026-06-01T14:00:00.000Z',
      windowEnd: '2026-06-01T15:00:00.000Z',
      signalWindowMinutes: 60,
      events: [],
    }
    const receipt = generateBurnReceipt(entry)
    const { valid } = validateBurnReceipt(receipt)
    expect(valid).toBe(true)
  })
})

// ── Audit ─────────────────────────────────────────────────────────────────────

describe('audit', () => {
  test('generateAuditLog returns correct structure', () => {
    const log = generateAuditLog([])
    expect(log.protocol).toBe('RSP')
    expect(log.summary.totalBurns).toBe(0)
  })

  test('summariseReceipts counts correctly', () => {
    const receipts = [
      { id: 'r1', nodeId: 'n1', method: 'deletion' as const, burnedAt: '2026-06-01T15:00:00.000Z', recordCount: 5, signalWindowMinutes: 60 },
      { id: 'r2', nodeId: 'n2', method: 'deletion' as const, burnedAt: '2026-06-01T15:01:00.000Z', recordCount: 3, signalWindowMinutes: 60 },
    ]
    const summary = summariseReceipts(receipts)
    expect(summary.totalBurns).toBe(2)
    expect(summary.totalRecordsDestroyed).toBe(8)
  })

  test('verifyBurnCoverage identifies unburned signals', () => {
    const signals: RSPNodeSignal[] = [
      { nodeId: 'n1', nodeType: 't', state: 'active', intensity: 0.5, trend: 'stable', signalWindowMinutes: 60, windowStart: '', windowEnd: '', sourceStatus: 'pending-burn', score: 10, eventCount: 1 },
    ]
    const { allBurned, unburnedNodeIds } = verifyBurnCoverage(signals, [])
    expect(allBurned).toBe(false)
    expect(unburnedNodeIds).toContain('n1')
  })
})

// ── Visualizer ────────────────────────────────────────────────────────────────

describe('visualizer', () => {
  test('getStateDisplay returns correct label for resonant', () => {
    const display = getStateDisplay('resonant')
    expect(display.label).toBe('Resonant')
    expect(display.colour).toBe('positive')
  })

  test('getStateDisplay returns critical for support_needed', () => {
    expect(getStateDisplay('support_needed').colour).toBe('critical')
  })

  test('renderSignal returns display object', () => {
    const signal: RSPNodeSignal = {
      nodeId: 'node-1',
      nodeType: 'lesson',
      state: 'friction',
      intensity: 0.6,
      trend: 'rising',
      signalWindowMinutes: 60,
      windowStart: '2026-06-01T14:00:00.000Z',
      windowEnd: '2026-06-01T15:00:00.000Z',
      sourceStatus: 'burned',
      score: 40,
      eventCount: 8,
    }
    const display = renderSignal(signal)
    expect(display.state.label).toBe('Friction')
    expect(display.trendLabel).toBe('↑ Rising')
  })

  test('getAttentionSignals filters correctly', () => {
    const signals: RSPNodeSignal[] = [
      { nodeId: 'n1', nodeType: 't', state: 'resonant',      intensity: 0.8, trend: 'stable', signalWindowMinutes: 60, windowStart: '', windowEnd: '', sourceStatus: 'burned', score: 60, eventCount: 5 },
      { nodeId: 'n2', nodeType: 't', state: 'support_needed', intensity: 0.9, trend: 'rising', signalWindowMinutes: 60, windowStart: '', windowEnd: '', sourceStatus: 'burned', score: 20, eventCount: 1 },
      { nodeId: 'n3', nodeType: 't', state: 'friction',       intensity: 0.5, trend: 'stable', signalWindowMinutes: 60, windowStart: '', windowEnd: '', sourceStatus: 'burned', score: 30, eventCount: 3 },
    ]
    const attention = getAttentionSignals(signals)
    expect(attention.length).toBe(2)
    expect(attention.map((s) => s.nodeId)).toContain('n2')
    expect(attention.map((s) => s.nodeId)).toContain('n3')
  })
})
