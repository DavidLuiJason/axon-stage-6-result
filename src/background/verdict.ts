/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage 6 — evidence verdict computed ONLY from the heartbeat log,
 * confirmed against whether the service is actually alive.
 *
 * Verdicts: PROVEN RUNNING | GAPS DETECTED | STOPPED | NEVER STARTED
 *
 * Expected heartbeat interval: 5 seconds.
 */

import type { HeartbeatRecord, JobSnapshot } from './types';

export const HEARTBEAT_INTERVAL_MS = 5000;
/** Tolerate up to 2.5 intervals before counting a gap. */
export const GAP_THRESHOLD_MS = Math.floor(HEARTBEAT_INTERVAL_MS * 2.5);

export type Verdict =
  | 'PROVEN RUNNING'
  | 'GAPS DETECTED'
  | 'STOPPED'
  | 'NEVER STARTED';

export interface EvidenceStats {
  beatsReceived: number;
  beatsExpected: number;
  missed: number;
  longestGapMs: number;
  lastHeartbeatAgeMs: number | null;
  restartedEvents: number;
  timeoutEvents: number;
  batterySamples: number[];
  verdict: Verdict;
}

/**
 * Compute evidence stats and verdict from a snapshot.
 * A UI timer or notification chronometer is NOT evidence — only native heartbeats.
 */
export function computeEvidence(
  snap: JobSnapshot,
  now: number = Date.now()
): EvidenceStats {
  const heartbeats = (snap.heartbeats ?? []).filter(
    (h) => h.eventType === 'HEARTBEAT' || h.eventType === 'RESTARTED'
  );
  const all = snap.heartbeats ?? [];

  const restartedEvents = all.filter((h) => h.eventType === 'RESTARTED').length;
  const timeoutEvents = all.filter((h) => h.eventType === 'TIMEOUT').length;

  const batterySamples = all
    .map((h) => h.batteryPercent)
    .filter((b): b is number => typeof b === 'number' && Number.isFinite(b));

  if (all.length === 0 && !snap.running && snap.startWallClock == null) {
    return {
      beatsReceived: 0,
      beatsExpected: 0,
      missed: 0,
      longestGapMs: 0,
      lastHeartbeatAgeMs: null,
      restartedEvents: 0,
      timeoutEvents: 0,
      batterySamples: [],
      verdict: 'NEVER STARTED',
    };
  }

  const beatsReceived = heartbeats.length;
  let longestGapMs = 0;
  let missed = 0;

  // Sort by wall clock
  const sorted = [...heartbeats].sort((a, b) => a.wallClock - b.wallClock);

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].wallClock - sorted[i - 1].wallClock;
    if (gap > longestGapMs) longestGapMs = gap;
    if (gap > GAP_THRESHOLD_MS) {
      // Count how many beats were missed in this gap
      const expectedInGap = Math.floor(gap / HEARTBEAT_INTERVAL_MS) - 1;
      if (expectedInGap > 0) missed += expectedInGap;
    }
  }

  // Also consider gap recorded on RESTARTED events
  for (const h of all) {
    if (h.eventType === 'RESTARTED' && typeof h.gapMs === 'number') {
      if (h.gapMs > longestGapMs) longestGapMs = h.gapMs;
      const expectedInGap = Math.floor(h.gapMs / HEARTBEAT_INTERVAL_MS) - 1;
      if (expectedInGap > 0) missed += expectedInGap;
    }
  }

  const lastHb = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const lastHeartbeatAgeMs =
    lastHb != null ? Math.max(0, now - lastHb.wallClock) : null;

  // Expected beats from start if we have a start time
  let beatsExpected = beatsReceived;
  if (snap.startWallClock != null) {
    const end =
      snap.running && snap.serviceActive
        ? now
        : lastHb
          ? lastHb.wallClock
          : snap.startWallClock;
    const duration = Math.max(0, end - snap.startWallClock);
    beatsExpected = Math.max(1, Math.floor(duration / HEARTBEAT_INTERVAL_MS) + 1);
  }

  // Verdict logic
  let verdict: Verdict;
  if (all.length === 0 && !snap.running) {
    verdict = 'NEVER STARTED';
  } else if (timeoutEvents > 0 && !snap.running) {
    verdict = 'STOPPED';
  } else if (!snap.running || !snap.serviceActive) {
    // Explicit stop or service dead
    if (missed > 0 || longestGapMs > GAP_THRESHOLD_MS || restartedEvents > 0) {
      verdict = 'GAPS DETECTED';
    } else {
      verdict = 'STOPPED';
    }
  } else {
    // Service claims active
    const stale =
      lastHeartbeatAgeMs != null && lastHeartbeatAgeMs > GAP_THRESHOLD_MS;
    if (stale || missed > 0 || longestGapMs > GAP_THRESHOLD_MS || restartedEvents > 0) {
      verdict = 'GAPS DETECTED';
    } else if (beatsReceived > 0) {
      verdict = 'PROVEN RUNNING';
    } else {
      // Started but no heartbeat yet — still early
      verdict = 'PROVEN RUNNING';
    }
  }

  return {
    beatsReceived,
    beatsExpected,
    missed,
    longestGapMs,
    lastHeartbeatAgeMs,
    restartedEvents,
    timeoutEvents,
    batterySamples,
    verdict,
  };
}

/**
 * Pure helper used by unit tests: build a synthetic JobSnapshot from records.
 */
export function snapshotFromLog(
  records: HeartbeatRecord[],
  opts: Partial<JobSnapshot> = {}
): JobSnapshot {
  const last = records[records.length - 1];
  return {
    jobId: opts.jobId ?? last?.jobId ?? null,
    jobKind: opts.jobKind ?? 'counter',
    running: opts.running ?? false,
    startWallClock: opts.startWallClock ?? records[0]?.wallClock ?? null,
    stepLabel: opts.stepLabel ?? last?.stepLabel ?? '',
    counterValue: opts.counterValue ?? last?.counterValue ?? 0,
    serviceActive: opts.serviceActive ?? false,
    heartbeats: records,
  };
}
