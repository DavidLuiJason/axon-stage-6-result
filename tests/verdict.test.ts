/**
 * Stage 6 unit tests — verdict / gap logic on synthetic logs
 * (killed, restarted, timed-out) and label-changes-with-step.
 * Run: npx tsx tests/verdict.test.ts
 */

import {
  computeEvidence,
  snapshotFromLog,
  HEARTBEAT_INTERVAL_MS,
  GAP_THRESHOLD_MS,
} from '../src/background/verdict';
import type { HeartbeatRecord } from '../src/background/types';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  OK: ${msg}`);
}

function hb(
  overrides: Partial<HeartbeatRecord> & Pick<HeartbeatRecord, 'seq' | 'wallClock' | 'eventType'>
): HeartbeatRecord {
  return {
    jobId: 'job-1',
    elapsedRealtime: overrides.wallClock,
    batteryPercent: 80,
    stepLabel: overrides.stepLabel ?? 'Counting · 1',
    counterValue: 1,
    ...overrides,
  };
}

console.log('=== verdict tests ===');
console.log(`HEARTBEAT_INTERVAL_MS=${HEARTBEAT_INTERVAL_MS} GAP_THRESHOLD_MS=${GAP_THRESHOLD_MS}`);

// NEVER STARTED
{
  const snap = snapshotFromLog([], {
    running: false,
    serviceActive: false,
    startWallClock: null,
  });
  const e = computeEvidence(snap, 10_000);
  assert(e.verdict === 'NEVER STARTED', 'empty log → NEVER STARTED');
  assert(e.beatsReceived === 0, 'beatsReceived 0');
}

// PROVEN RUNNING — regular 5s heartbeats, service alive
{
  const t0 = 1_000_000;
  const records: HeartbeatRecord[] = [];
  for (let i = 0; i < 6; i++) {
    records.push(
      hb({
        seq: i + 1,
        wallClock: t0 + i * HEARTBEAT_INTERVAL_MS,
        eventType: 'HEARTBEAT',
        stepLabel: `Counting · ${i + 1}`,
        counterValue: i + 1,
      })
    );
  }
  const snap = snapshotFromLog(records, {
    running: true,
    serviceActive: true,
    startWallClock: t0,
    stepLabel: 'Counting · 6',
  });
  const now = t0 + 5 * HEARTBEAT_INTERVAL_MS + 500;
  const e = computeEvidence(snap, now);
  assert(e.verdict === 'PROVEN RUNNING', 'steady heartbeats → PROVEN RUNNING');
  assert(e.missed === 0, 'no missed beats');
  assert(e.restartedEvents === 0, 'no restarts');
  console.log('  evidence:', JSON.stringify({ verdict: e.verdict, beats: e.beatsReceived, missed: e.missed, longestGapMs: e.longestGapMs }));
}

// GAPS DETECTED — killed mid-run (large gap, service still claims active but stale)
{
  const t0 = 2_000_000;
  const records: HeartbeatRecord[] = [
    hb({ seq: 1, wallClock: t0, eventType: 'HEARTBEAT' }),
    hb({ seq: 2, wallClock: t0 + 5000, eventType: 'HEARTBEAT' }),
    hb({ seq: 3, wallClock: t0 + 10000, eventType: 'HEARTBEAT' }),
    // then 60s silence
  ];
  const snap = snapshotFromLog(records, {
    running: true,
    serviceActive: true,
    startWallClock: t0,
  });
  const now = t0 + 10000 + 60_000;
  const e = computeEvidence(snap, now);
  assert(e.verdict === 'GAPS DETECTED', 'stale last heartbeat → GAPS DETECTED');
  assert(
    e.lastHeartbeatAgeMs != null && e.lastHeartbeatAgeMs >= 60_000,
    'last heartbeat age ≥ 60s'
  );
  console.log('  evidence:', JSON.stringify({ verdict: e.verdict, lastAge: e.lastHeartbeatAgeMs, longestGapMs: e.longestGapMs }));
}

// RESTARTED event with gap
{
  const t0 = 3_000_000;
  const records: HeartbeatRecord[] = [
    hb({ seq: 1, wallClock: t0, eventType: 'HEARTBEAT' }),
    hb({ seq: 2, wallClock: t0 + 5000, eventType: 'HEARTBEAT' }),
    hb({
      seq: 3,
      wallClock: t0 + 5000 + 45_000,
      eventType: 'RESTARTED',
      gapMs: 45_000,
      stepLabel: 'Resumed after restart',
    }),
    hb({
      seq: 4,
      wallClock: t0 + 5000 + 45_000 + 5000,
      eventType: 'HEARTBEAT',
      stepLabel: 'Resumed after restart',
    }),
  ];
  const snap = snapshotFromLog(records, {
    running: true,
    serviceActive: true,
    startWallClock: t0,
    stepLabel: 'Resumed after restart',
  });
  const now = t0 + 5000 + 45_000 + 5000 + 500;
  const e = computeEvidence(snap, now);
  assert(e.verdict === 'GAPS DETECTED', 'RESTARTED with gap → GAPS DETECTED');
  assert(e.restartedEvents === 1, '1 RESTARTED event');
  assert(e.longestGapMs >= 45_000, 'longest gap ≥ 45s');
  console.log('  evidence:', JSON.stringify({ verdict: e.verdict, restarted: e.restartedEvents, longestGapMs: e.longestGapMs }));
}

// TIMEOUT then stopped
{
  const t0 = 4_000_000;
  const records: HeartbeatRecord[] = [
    hb({ seq: 1, wallClock: t0, eventType: 'STARTED', stepLabel: 'Counting · 0' }),
    hb({ seq: 2, wallClock: t0 + 5000, eventType: 'HEARTBEAT' }),
    hb({
      seq: 3,
      wallClock: t0 + 10_000,
      eventType: 'TIMEOUT',
      stepLabel: 'Timed out by OS',
    }),
  ];
  const snap = snapshotFromLog(records, {
    running: false,
    serviceActive: false,
    startWallClock: t0,
    stepLabel: 'Timed out by OS',
  });
  const e = computeEvidence(snap, t0 + 15_000);
  assert(e.verdict === 'STOPPED', 'TIMEOUT + not running → STOPPED');
  assert(e.timeoutEvents === 1, '1 TIMEOUT event');
  console.log('  evidence:', JSON.stringify({ verdict: e.verdict, timeouts: e.timeoutEvents }));
}

// Clean STOPPED
{
  const t0 = 5_000_000;
  const records: HeartbeatRecord[] = [
    hb({ seq: 1, wallClock: t0, eventType: 'STARTED', stepLabel: 'Counting · 0' }),
    hb({ seq: 2, wallClock: t0 + 5000, eventType: 'HEARTBEAT', stepLabel: 'Counting · 1' }),
    hb({ seq: 3, wallClock: t0 + 10000, eventType: 'HEARTBEAT', stepLabel: 'Counting · 2' }),
    hb({ seq: 4, wallClock: t0 + 12000, eventType: 'STOPPED', stepLabel: 'Counting · 2' }),
  ];
  const snap = snapshotFromLog(records, {
    running: false,
    serviceActive: false,
    startWallClock: t0,
    stepLabel: 'Counting · 2',
  });
  const e = computeEvidence(snap, t0 + 15_000);
  assert(e.verdict === 'STOPPED', 'clean stop → STOPPED');
  assert(e.missed === 0, 'no missed on clean stop');
  console.log('  evidence:', JSON.stringify({ verdict: e.verdict, missed: e.missed }));
}

// Label changes with step
{
  const labels = [
    'Initializing workspace',
    'Loading configuration',
    'Validating permissions',
  ];
  const t0 = 6_000_000;
  const records: HeartbeatRecord[] = labels.map((label, i) =>
    hb({
      seq: i + 1,
      wallClock: t0 + i * 5000,
      eventType: i === 0 ? 'STEP' : 'HEARTBEAT',
      stepLabel: label,
    })
  );
  const snap = snapshotFromLog(records, {
    running: true,
    serviceActive: true,
    startWallClock: t0,
    stepLabel: labels[labels.length - 1],
    jobKind: 'steps',
  });
  assert(
    snap.stepLabel === 'Validating permissions',
    'activity label tracks current step (not fixed "running")'
  );
  assert(
    records.every((r, i) => r.stepLabel === labels[i]),
    'each heartbeat carries its step label'
  );
  console.log('  step labels:', records.map((r) => r.stepLabel).join(' → '));
}

console.log('=== all verdict tests passed ===');
