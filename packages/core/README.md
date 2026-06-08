# `@rsp-protocol/core`

**Respectful Synchronised Protocol — core pipeline**

Translate behaviour. Synchronise the signal. Burn the identifiable source.

[![npm](https://img.shields.io/npm/v/@rsp-protocol/core)](https://www.npmjs.com/package/@rsp-protocol/core)
[![GitHub](https://img.shields.io/badge/github-%40rsp-lightgrey)](https://github.com/rsp)
[![Protocol](https://img.shields.io/badge/protocol-lovekeylink.com%2Frsp-red)](https://lovekeylink.com/rsp)

---

## What is RSP?

RSP is a privacy-first coordination framework for systems that observe behaviour — human, AI, or hybrid — and need to act on it without surveilling, profiling, or coercing the people involved.

`@rsp-protocol/core` is the framework-agnostic pipeline. It works in any JavaScript or TypeScript environment: browser, Node.js, edge functions, and AI agent runtimes.

For React integration, see [`@rsp-protocol/react`](https://www.npmjs.com/package/@rsp-protocol/react).

---

## Installation

```bash
npm install @rsp-protocol/core
# or
pnpm add @rsp-protocol/core
# or
yarn add @rsp-protocol/core
```

---

## The Core Flow

```
Observe minimum → Check consent → Normalise → Apply weight →
Aggregate to node signal → Render visual state → Expire → Burn source
```

Every step has an explicit function. Nothing is automatic. You decide when each step runs.

---

## Quick Start

```typescript
import {
  createConsent,
  hasConsent,
  translate,
  aggregate,
  toNodeSignal,
  markBurned,
  generateBurnReceipt,
  renderSignal,
} from '@rsp-protocol/core'

// 1. Create a consent record — always check consent before processing
const consent = createConsent({
  id: 'c1',
  nodeId: 'node-anon-abc123',  // anonymised — never a real user ID
  scope: ['analytics'],
  durationDays: 30,
})

if (!hasConsent(consent, 'analytics')) {
  throw new Error('No consent — cannot process event')
}

// 2. Translate a raw event into a normalised RSP event
const normalisedEvent = translate(
  {
    nodeId: 'node-anon-abc123',
    eventType: 'activeMinute',
    timestamp: new Date().toISOString(),
  },
  { nodeType: 'lesson', signalWindowMinutes: 60 }
)
// → { nodeId, weight: 10, sourceStatus: 'normalised', ... }

// 3. Aggregate to a node signal
const entries = aggregate([normalisedEvent])
const signal = toNodeSignal(entries.get('node-anon-abc123')!)
// → { state: 'aware', intensity: 0.07, trend: 'stable', sourceStatus: 'pending-burn', ... }

// 4. Burn the source — this is the defining step
const entry = entries.get('node-anon-abc123')!
const receipt = generateBurnReceipt(entry, 'deletion')
const burnedSignal = markBurned(signal)
// → { ...signal, sourceStatus: 'burned' }
// Store the receipt. The source records are gone.

// 5. Render for UI or agent consumption
const display = renderSignal(burnedSignal)
// → { state: { label: 'Aware', colour: 'neutral', suggestedAction: '...' }, ... }
```

---

## API Reference

### Consent

```typescript
import { createConsent, hasConsent, withdrawConsent, isExpired, SCOPE_MAP } from '@rsp-protocol/core'
```

| Function | Description |
|---|---|
| `createConsent(params)` | Create a new consent record with scope, nodeId, and optional expiry |
| `hasConsent(consent, scope)` | Returns `true` if consent is active, unexpired, and covers the requested scope |
| `withdrawConsent(consent)` | Returns a new consent object with `active: false` — does not mutate |
| `isExpired(consent)` | Returns `true` if the consent record has passed its expiry date |
| `SCOPE_MAP` | Maps consent scopes to the event types they cover |

**Consent scopes:** `coordination` · `learning` · `support` · `analytics` · `full`

---

### Tracker

```typescript
import { RSPTracker, createTracker } from '@rsp-protocol/core'
```

```typescript
const tracker = createTracker({
  nodeId: 'node-anon-abc123',  // must be anonymised
  signalWindowMinutes: 60,
  enabled: true,
})

// Listen for captured events
tracker.onEvent((rawEvent) => {
  // forward to translate()
})

// Capture events
tracker.pageView()
tracker.activeMinute()
tracker.completionOrConversion()
tracker.capture('customEventType')
```

`RSPTracker` is a base class — extend it for browser, Node, or agent-specific implementations.

**Built-in capture methods:** `pageView` · `scroll50` · `scroll90` · `elementClick` · `activeMinute` · `formInteraction` · `resourceDownload` · `returnVisit` · `completionOrConversion` · `humanCorrection` · `agentHandoff` · `safetyEscalation` · `quizRetry` · `videoRewind`

---

### Translator

```typescript
import { translate, translateBatch, bucketToWindow } from '@rsp-protocol/core'
```

| Function | Description |
|---|---|
| `translate(event, options?)` | Translate a single raw event into a normalised RSP event — strips context, applies weight, buckets timestamp |
| `translateBatch(events, options?)` | Translate multiple raw events in one pass |
| `bucketToWindow(timestamp, windowMinutes)` | Round a timestamp down to the nearest signal window — reduces re-identification risk |

**Translate options:**

```typescript
{
  nodeType?: string            // default: 'element'
  signalWindowMinutes?: number // default: 60
  weights?: RSPWeightMap       // custom weight overrides
  bucketTimestamp?: boolean    // default: true — recommended for privacy
}
```

---

### Weights

```typescript
import { DEFAULT_WEIGHTS, getWeight, mergeWeights, validateWeights } from '@rsp-protocol/core'
```

| Event type | Default weight |
|---|---|
| `completionOrConversion` | 25 |
| `returnVisit` | 20 |
| `safetyEscalation` | 20 |
| `resourceDownload` | 15 |
| `formInteraction` | 12 |
| `humanCorrection` | 12 |
| `activeMinute` | 10 |
| `agentHandoff` | 10 |
| `elementClick` | 8 |
| `quizRetry` | 8 |
| `videoRewind` | 6 |
| `scroll90` | 5 |
| `scroll50` | 3 |
| `pageView` | 1 |

Override weights per deployment:

```typescript
import { mergeWeights } from '@rsp-protocol/core'

const weights = mergeWeights({
  completionOrConversion: 50,  // higher priority for your vertical
  pageView: 0,                 // ignore page views
})
```

---

### Aggregator

```typescript
import { aggregate, toNodeSignal, DEFAULT_THRESHOLDS } from '@rsp-protocol/core'
```

| Function | Description |
|---|---|
| `aggregate(events, windowStart?)` | Accumulate normalised events into a `Map<nodeId, AggregationEntry>` |
| `toNodeSignal(entry, thresholds?, previousScore?)` | Map an aggregation entry to an `RSPNodeSignal` |
| `DEFAULT_THRESHOLDS` | Default score thresholds for state mapping |

**Custom thresholds:**

```typescript
const signal = toNodeSignal(entry, {
  dormant:  0,
  aware:    10,   // raise the bar for your vertical
  active:   40,
  resonant: 100,
  overload: 300,
})
```

---

### Burn

```typescript
import {
  markBurned,
  generateBurnReceipt,
  isWindowExpired,
  getBurnDeadline,
  validateBurnReceipt,
  burnBatch,
} from '@rsp-protocol/core'
```

| Function | Description |
|---|---|
| `markBurned(signal)` | Returns a new signal with `sourceStatus: 'burned'` — does not mutate |
| `generateBurnReceipt(entry, method?, dataHash?)` | Generate an audit receipt for a burn event |
| `isWindowExpired(windowEnd)` | Returns `true` if the signal window has closed |
| `getBurnDeadline(windowEnd)` | Returns the `Date` by which the source must be burned |
| `validateBurnReceipt(receipt)` | Validate a burn receipt — returns `{ valid, errors }` |
| `burnBatch(entries, method?)` | Batch burn multiple aggregation entries |

**Burn methods:** `deletion` · `anonymisation` · `cryptographic-erasure` · `irreversible-decoupling`

---

### Audit

```typescript
import {
  generateAuditLog,
  summariseReceipts,
  verifyBurnCoverage,
  formatAuditLog,
} from '@rsp-protocol/core'
```

| Function | Description |
|---|---|
| `generateAuditLog(receipts, version?)` | Generate a structured `RSPAuditLog` from a set of burn receipts |
| `summariseReceipts(receipts)` | Summarise receipts — total burns, records destroyed, method breakdown |
| `verifyBurnCoverage(signals, receipts)` | Check all signals have a corresponding burn receipt |
| `formatAuditLog(log)` | Format an audit log as a human-readable compliance string |

```typescript
const log = generateAuditLog(receipts)
console.log(formatAuditLog(log))
// RSP Audit Log — v1.7
// Generated: 2026-06-08T...
//
// Summary
//   Total burns:             12
//   Total records destroyed: 48
//   ...
```

---

### Visualizer

```typescript
import {
  getStateDisplay,
  renderSignal,
  renderSignals,
  filterByState,
  getAttentionSignals,
  STATE_DISPLAY,
} from '@rsp-protocol/core'
```

| Function | Description |
|---|---|
| `getStateDisplay(state)` | Get label, description, colour, and suggested action for a visual state |
| `renderSignal(signal)` | Render a node signal as an `RSPSignalDisplay` object for UI consumption |
| `renderSignals(signals)` | Render multiple signals |
| `filterByState(signals, states)` | Filter a signal array by one or more visual states |
| `getAttentionSignals(signals)` | Returns signals in `support_needed`, `friction`, `overload`, `drop_off`, or `coordination_degraded` |
| `STATE_DISPLAY` | Full metadata map for all 13 visual states |

---

## Visual States

| State | Colour | Description |
|---|---|---|
| `dormant` | neutral | No meaningful signal in the current window |
| `aware` | neutral | Minimal activity detected |
| `active` | positive | Consistent engagement |
| `resonant` | positive | Strong, sustained engagement — optimal state |
| `friction` | warning | Repeated difficulty or resistance detected |
| `overload` | warning | Activity volume exceeding healthy threshold |
| `drop_off` | warning | Engagement declining toward abandonment |
| `support_needed` | critical | Escalation or distress signals present |
| `cooling` | info | Engagement declining but stable |
| `converting` | positive | Progressing toward a completion event |
| `mastery` | positive | Sustained high performance across the window |
| `coordination_degraded` | critical | System-level coordination breakdown |
| `coordination_healthy` | positive | System-level coordination operating normally |

---

## The Burn Clause

When user behaviour is translated, synchronised, aggregated, or converted into a protocol signal, any identifiable source information must be removed, destroyed, cryptographically erased, or irreversibly decoupled as soon as it is no longer necessary — unless retention is required by law, explicit consent, safety, or legitimate accountability.

**This is not optional. It is the defining clause of RSP compliance.**

---

## TypeScript

Full TypeScript support. All types are exported from the root:

```typescript
import type {
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
  RSPStateDisplay,
  RSPSignalDisplay,
  RSPAuditLog,
  RSPAuditSummary,
  StateThresholds,
  AggregationEntry,
  TranslateOptions,
} from '@rsp-protocol/core'
```

---

## Links

- [Protocol page](https://lovekeylink.com/rsp)
- [GitHub](https://github.com/rsp)
- [React package — `@rsp-protocol/react`](https://www.npmjs.com/package/@rsp-protocol/react)
- Genesis NFT: `0xA1755730C6F66dbe3de29e24F4Db9F448ef3FDD5` (Ethereum)

---

## License

Private — Copyright © 2026 Jack Oswald. All rights reserved unless otherwise licensed in writing.

Use of the RSP name, certification marks, or associated branding in commercial products requires a written Partner Licence.
