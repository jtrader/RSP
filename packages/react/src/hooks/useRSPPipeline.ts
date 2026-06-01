import { useCallback } from 'react'
import { useRSPTracker, type UseRSPTrackerOptions } from './useRSPTracker.js'
import { useNodeSignal, type UseNodeSignalOptions } from './useNodeSignal.js'
import type { RSPNormalisedEvent } from '@rsp/core'

// ── useRSPPipeline ────────────────────────────────────────────────────────────
// Convenience hook that wires useRSPTracker → useNodeSignal in one call.
// This is the primary hook for most integrations.
//
// Usage:
//   const { track, signal, display, isTracking } = useRSPPipeline({
//     nodeId: 'lesson-3',
//     consent,
//     nodeType: 'lesson',
//     signalWindowMinutes: 60,
//   })

export type UseRSPPipelineOptions =
  Omit<UseRSPTrackerOptions, 'onEvent'> &
  Omit<UseNodeSignalOptions, 'nodeId' | 'signalWindowMinutes' | 'nodeType'>

export function useRSPPipeline(options: UseRSPPipelineOptions) {
  const {
    nodeId,
    consent,
    consentScope,
    signalWindowMinutes = 60,
    nodeType = 'element',
    weights,
    thresholds,
    onBurn,
  } = options

  const signalHook = useNodeSignal({
    nodeId,
    signalWindowMinutes,
    nodeType,
    thresholds,
    onBurn,
  })

  const handleEvent = useCallback((event: RSPNormalisedEvent) => {
    signalHook.push(event)
  }, [signalHook.push])

  const trackerHook = useRSPTracker({
    nodeId,
    consent,
    consentScope,
    signalWindowMinutes,
    nodeType,
    weights,
    onEvent: handleEvent,
  })

  return {
    // tracker
    track: trackerHook.track,
    capture: trackerHook.capture,
    isTracking: trackerHook.isTracking,
    // signal
    signal: signalHook.signal,
    display: signalHook.display,
    push: signalHook.push,
    reset: signalHook.reset,
    receipts: signalHook.receipts,
  }
}
