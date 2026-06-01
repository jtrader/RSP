import { useEffect, useRef, useCallback } from 'react'
import {
  RSPTracker,
  createTracker,
  hasConsent,
  translate,
  type RSPConsent,
  type RSPEventType,
  type RSPRawEvent,
  type RSPWeightMap,
  type TranslateOptions,
  type RSPNormalisedEvent,
} from '@rsp/core'

// ── useRSPTracker ─────────────────────────────────────────────────────────────
// Wires the RSP tracker into a React component lifecycle.
// Handles consent gating, event capture, and normalisation.
// Automatically disables tracking when consent is withdrawn.

export interface UseRSPTrackerOptions {
  /** Anonymised node identifier — never a real user ID */
  nodeId: string
  /** Consent record — tracking disabled if null or invalid */
  consent: RSPConsent | null
  /** Consent scope required for this tracker */
  consentScope?: string
  /** Signal window in minutes */
  signalWindowMinutes?: number
  /** Node type label */
  nodeType?: string
  /** Custom weight overrides */
  weights?: RSPWeightMap
  /** Called whenever a normalised event is ready for the pipeline */
  onEvent?: (event: RSPNormalisedEvent) => void
}

export interface UseRSPTrackerReturn {
  /** Capture any event type */
  capture: (eventType: RSPEventType) => void
  /** Convenience capture methods */
  track: {
    pageView: () => void
    scroll50: () => void
    scroll90: () => void
    elementClick: () => void
    activeMinute: () => void
    formInteraction: () => void
    resourceDownload: () => void
    returnVisit: () => void
    completionOrConversion: () => void
    humanCorrection: () => void
    agentHandoff: () => void
    safetyEscalation: () => void
    quizRetry: () => void
    videoRewind: () => void
  }
  /** Whether tracking is currently active */
  isTracking: boolean
}

export function useRSPTracker(options: UseRSPTrackerOptions): UseRSPTrackerReturn {
  const {
    nodeId,
    consent,
    consentScope = 'analytics',
    signalWindowMinutes = 60,
    nodeType = 'element',
    weights,
    onEvent,
  } = options

  const trackerRef = useRef<RSPTracker | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const isTracking = hasConsent(consent, consentScope as any)

  // initialise tracker
  useEffect(() => {
    trackerRef.current = createTracker({
      nodeId,
      signalWindowMinutes,
      enabled: isTracking,
    })

    trackerRef.current.onEvent((rawEvent: RSPRawEvent) => {
      if (!onEventRef.current) return
      const translateOptions: TranslateOptions = {
        nodeType,
        signalWindowMinutes,
        weights,
        bucketTimestamp: true,
      }
      const normalised = translate(rawEvent, translateOptions)
      onEventRef.current(normalised)
    })

    return () => {
      trackerRef.current = null
    }
  }, [nodeId, signalWindowMinutes, nodeType])

  // sync enabled state with consent
  useEffect(() => {
    trackerRef.current?.setEnabled(isTracking)
  }, [isTracking])

  const capture = useCallback((eventType: RSPEventType) => {
    trackerRef.current?.capture(eventType)
  }, [])

  const track = {
    pageView:               () => capture('pageView'),
    scroll50:               () => capture('scroll50'),
    scroll90:               () => capture('scroll90'),
    elementClick:           () => capture('elementClick'),
    activeMinute:           () => capture('activeMinute'),
    formInteraction:        () => capture('formInteraction'),
    resourceDownload:       () => capture('resourceDownload'),
    returnVisit:            () => capture('returnVisit'),
    completionOrConversion: () => capture('completionOrConversion'),
    humanCorrection:        () => capture('humanCorrection'),
    agentHandoff:           () => capture('agentHandoff'),
    safetyEscalation:       () => capture('safetyEscalation'),
    quizRetry:              () => capture('quizRetry'),
    videoRewind:            () => capture('videoRewind'),
  }

  return { capture, track, isTracking }
}
