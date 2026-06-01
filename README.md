# RSP — Respectful Synchronised Protocol

**Synchronisation without coercion.**

Translate behaviour. Synchronise the signal. Burn the identifiable source.

---

## What is RSP?

RSP is a privacy-first coordination framework for systems that observe behaviour — human, AI, or hybrid — and need to act on it without surveilling, profiling, or coercing the people involved.

RSP defines how to translate raw behavioural events into minimal, low-resolution signals; how to synchronise those signals into a shared coordination state; and how to destroy the identifiable source data once it has served its purpose.

- Protocol page: [lovekeylink.com/rsp](https://lovekeylink.com/rsp)
- Genesis NFT: `0xA1755730C6F66dbe3de29e24F4Db9F448ef3FDD5` (Ethereum)

## The Core Flow

```
Observe minimum → Check consent → Normalise → Apply weight →
Aggregate to node signal → Render visual state → Expire → Burn source
```

## Packages

| Package | Description |
|---|---|
| [`@rsp/core`](./packages/core) | Core pipeline — tracker, consent, weights, translator, aggregator, burn, audit, visualizer |

## Getting Started

```bash
pnpm install
pnpm build
pnpm test
```

## `@rsp/core` — Quick Example

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
} from '@rsp/core'

// 1. Check consent
const consent = createConsent({
  id: 'c1',
  nodeId: 'node-anon-abc123',
  scope: ['analytics'],
  durationDays: 30,
})

if (!hasConsent(consent, 'analytics')) {
  throw new Error('No consent — cannot process event')
}

// 2. Translate raw event to normalised RSP event
const normalisedEvent = translate(
  { nodeId: 'node-anon-abc123', eventType: 'activeMinute', timestamp: new Date().toISOString() },
  { nodeType: 'lesson', signalWindowMinutes: 60 }
)
// { nodeId: 'node-anon-abc123', weight: 10, sourceStatus: 'normalised', ... }

// 3. Aggregate to node signal
const entries = aggregate([normalisedEvent])
const signal = toNodeSignal(entries.get('node-anon-abc123')!)
// { state: 'aware', intensity: 0.07, trend: 'stable', sourceStatus: 'pending-burn', ... }

// 4. Burn the source
const entry = entries.get('node-anon-abc123')!
const receipt = generateBurnReceipt(entry, 'deletion')
const burnedSignal = markBurned(signal)
// { ...signal, sourceStatus: 'burned' }
// receipt → store this; the source records are gone

// 5. Render for UI or agent consumption
const display = renderSignal(burnedSignal)
// { state: { label: 'Aware', colour: 'neutral', suggestedAction: '...' }, ... }
```

## The Identifiable Source Burn Clause

When user behaviour is translated, synchronised, aggregated, or converted into a protocol signal, any identifiable source information must be removed, destroyed, cryptographically erased, or irreversibly decoupled as soon as it is no longer necessary — unless retention is required by law, explicit consent, safety, or legitimate accountability.

**This is not optional. It is the defining clause of RSP compliance.**

## Visual States

RSP uses 13 named visual states — intentionally low-resolution:

`dormant` `aware` `active` `resonant` `friction` `overload` `drop_off` `support_needed` `cooling` `converting` `mastery` `coordination_degraded` `coordination_healthy`

States are rendered visually, not numerically. Downstream systems act on a state, not a score.

## License

Private — Copyright © 2026 Jack Oswald. All rights reserved unless otherwise licensed in writing.

Use of the RSP name, certification marks, or associated branding in commercial products requires a written Partner Licence.
