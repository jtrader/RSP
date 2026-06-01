import type { RSPRawEvent, RSPEventType } from '../types.js'

// ── Tracker ───────────────────────────────────────────────────────────────────
// RSP Step 1: Capture the minimum event required.
// The tracker is environment-specific — this module provides the interface
// and helpers. Browser, Node, and agent implementations extend from here.
//
// CRITICAL: nodeId must be an anonymised identifier — never a real user ID,
// email address, or any personally identifying value.

export interface TrackerOptions {
  /** Anonymised node identifier */
  nodeId: string
  /** Signal window in minutes */
  signalWindowMinutes?: number
  /** Whether tracking is active */
  enabled?: boolean
}

export interface TrackerEvent {
  eventType: RSPEventType
  context?: Record<string, unknown>
}

export type EventHandler = (event: RSPRawEvent) => void

/**
 * Base tracker class — extend for browser, Node, or agent environments.
 */
export class RSPTracker {
  protected nodeId: string
  protected signalWindowMinutes: number
  protected enabled: boolean
  private handlers: EventHandler[] = []

  constructor(options: TrackerOptions) {
    this.nodeId = options.nodeId
    this.signalWindowMinutes = options.signalWindowMinutes ?? 60
    this.enabled = options.enabled ?? true
  }

  /**
   * Register an event handler — called whenever an event is captured.
   */
  onEvent(handler: EventHandler): void {
    this.handlers.push(handler)
  }

  /**
   * Capture an event and dispatch to handlers.
   */
  capture(eventType: RSPEventType, context?: Record<string, unknown>): void {
    if (!this.enabled) return

    const event: RSPRawEvent = {
      nodeId: this.nodeId,
      eventType,
      timestamp: new Date().toISOString(),
      ...(context ? { context } : {}),
    }

    for (const handler of this.handlers) {
      handler(event)
    }
  }

  /**
   * Enable or disable tracking.
   * Call this when consent is withdrawn.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Convenience capture methods for common event types.
   */
  pageView()                        { this.capture('pageView') }
  scroll50()                        { this.capture('scroll50') }
  scroll90()                        { this.capture('scroll90') }
  elementClick(context?: Record<string, unknown>) { this.capture('elementClick', context) }
  activeMinute()                    { this.capture('activeMinute') }
  formInteraction()                 { this.capture('formInteraction') }
  resourceDownload()                { this.capture('resourceDownload') }
  returnVisit()                     { this.capture('returnVisit') }
  completionOrConversion()          { this.capture('completionOrConversion') }
  humanCorrection()                 { this.capture('humanCorrection') }
  agentHandoff()                    { this.capture('agentHandoff') }
  safetyEscalation()                { this.capture('safetyEscalation') }
  quizRetry()                       { this.capture('quizRetry') }
  videoRewind()                     { this.capture('videoRewind') }
}

/**
 * Create a tracker instance.
 */
export function createTracker(options: TrackerOptions): RSPTracker {
  return new RSPTracker(options)
}
