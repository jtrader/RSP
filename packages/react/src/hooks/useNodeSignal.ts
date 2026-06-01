import { useState, useEffect, useRef, useCallback } from 'react'
import {
  aggregate,
  toNodeSignal,
  markBurned,
  generateBurnReceipt,
  isWindowExpired,
  renderSignal,
  type RSPNormalisedEvent,
  type RSPNodeSignal,
  type RSPBurnReceipt,
  type StateThresholds,
  type RSPSignalDisplay,
} from '@rsp/core'

// ── useNodeSignal ─────────────────────────────────────────────────────────────
// Accumulates normalised events into a windowed node signal.
// Automatically expires windows, burns sources, and re-renders on state change.

export interface UseNodeSignalOptions {
  /** Anonymised node identifier */
  nodeId: string
  /** Signal window in minutes */
  signalWindowMinutes?: number
  /** Node type label */
  nodeType?: string
  /** Custom state thresholds */
  thresholds?: StateThresholds
  /** Called when a burn receipt is generated */
  onBurn?: (receipt: RSPBurnReceipt) => void
}

export interface UseNodeSignalReturn {
  /** Current node signal — null until first event */
  signal: RSPNodeSignal | null
  /** Rendered display object for UI consumption */
  display: RSPSignalDisplay | null
  /** Feed a normalised event into the signal */
  push: (event: RSPNormalisedEvent) => void
  /** Manually reset the current window */
  reset: () => void
  /** All burn receipts generated in this session */
  receipts: RSPBurnReceipt[]
}

export function useNodeSignal(options: UseNodeSignalOptions): UseNodeSignalReturn {
  const {
    nodeId,
    signalWindowMinutes = 60,
    nodeType = 'element',
    thresholds,
    onBurn,
  } = options

  const [signal, setSignal] = useState<RSPNodeSignal | null>(null)
  const [receipts, setReceipts] = useState<RSPBurnReceipt[]>([])

  const eventsRef    = useRef<RSPNormalisedEvent[]>([])
  const windowStart  = useRef<Date>(new Date())
  const prevScore    = useRef<number | undefined>(undefined)
  const onBurnRef    = useRef(onBurn)
  onBurnRef.current  = onBurn

  const flushWindow = useCallback(() => {
    const events = eventsRef.current
    if (events.length === 0) return

    const entries = aggregate(events, windowStart.current)
    const entry   = entries.get(nodeId)
    if (!entry) return

    const newSignal  = toNodeSignal(entry, thresholds, prevScore.current)
    const burned     = markBurned(newSignal)
    const receipt    = generateBurnReceipt(entry)

    prevScore.current = entry.score

    setSignal(burned)
    setReceipts((prev) => [...prev, receipt])
    onBurnRef.current?.(receipt)

    // reset for next window
    eventsRef.current = []
    windowStart.current = new Date()
  }, [nodeId, thresholds])

  // window expiry timer
  useEffect(() => {
    const intervalMs = signalWindowMinutes * 60 * 1000
    const timer = setInterval(() => {
      const windowEnd = new Date(windowStart.current.getTime() + intervalMs)
      if (isWindowExpired(windowEnd.toISOString())) {
        flushWindow()
      }
    }, 30_000) // check every 30 seconds

    return () => clearInterval(timer)
  }, [signalWindowMinutes, flushWindow])

  const push = useCallback((event: RSPNormalisedEvent) => {
    if (event.nodeId !== nodeId) return
    eventsRef.current.push(event)

    // optimistic update — recompute signal immediately for responsive UI
    const entries = aggregate(eventsRef.current, windowStart.current)
    const entry   = entries.get(nodeId)
    if (!entry) return

    const updated = toNodeSignal(entry, thresholds, prevScore.current)
    setSignal(updated)
  }, [nodeId, thresholds])

  const reset = useCallback(() => {
    flushWindow()
  }, [flushWindow])

  const display = signal ? renderSignal(signal) : null

  return { signal, display, push, reset, receipts }
}
