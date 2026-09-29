# Stage 6 — Background Execution Proof Evidence

## What counts as evidence

Only **native heartbeats** written by `BackgroundJobService` every 5 seconds to a persistent SharedPreferences log are evidence. Fields per record:

| Field | Meaning |
|-------|---------|
| `jobId` | Job identity |
| `seq` | Monotonic sequence |
| `wallClock` | `System.currentTimeMillis()` |
| `elapsedRealtime` | `SystemClock.elapsedRealtime()` |
| `batteryPercent` | BatteryManager capacity |
| `stepLabel` | Current activity label (never a fixed word like "running") |
| `eventType` | `STARTED` / `HEARTBEAT` / `STEP` / `RESTARTED` / `TIMEOUT` / `STOPPED` |
| `gapMs` | Present on `RESTARTED` — gap since last known heartbeat |
| `counterValue` | Persisted counter when kind is `counter` |

A UI timer or notification chronometer is **not** evidence.

## Verdict rules (computed only from the log + service-alive flag)

| Verdict | When |
|---------|------|
| `NEVER STARTED` | No log records and no start time |
| `PROVEN RUNNING` | Service active, recent heartbeats, no material gaps |
| `GAPS DETECTED` | Missed beats, long gap, RESTARTED, or stale last heartbeat while “running” |
| `STOPPED` | Not running; clean stop or TIMEOUT |

Gap threshold = 2.5 × 5s = 12.5s between consecutive heartbeats.

## Unit test output (synthetic logs)

Run: `npm run test:bg`

```
=== elapsedFormat tests ===
  OK: 0 ms → 0s
  OK: 1s
  OK: 42s
  OK: 3m 05s
  OK: 1h 04m 12s
  OK: 2d 3h 10m
  OK: negative clamped to 0s
  OK: null start → 0
  OK: elapsedFromStart delta
=== all elapsedFormat tests passed ===
=== verdict tests ===
  OK: empty log → NEVER STARTED
  OK: steady heartbeats → PROVEN RUNNING
  OK: stale last heartbeat → GAPS DETECTED
  OK: RESTARTED with gap → GAPS DETECTED
  OK: TIMEOUT + not running → STOPPED
  OK: clean stop → STOPPED
  OK: activity label tracks current step (not fixed "running")
=== all verdict tests passed ===
```

## Device behavior

**UNVERIFIED** on a physical device in this environment (no Android SDK / emulator / phone).  
Owner must install the debug APK and:

1. Start counter, leave app, confirm notification updates every ~5s with live activity label + elapsed.
2. Export diagnostics JSON and confirm native `HEARTBEAT` records.
3. Force-stop / restart scenarios for `RESTARTED` + gap.
4. Confirm idle state: no service when no job.

## Web fallback

Platform reports `web-fallback` with reason: *cannot run in background; foreground only*.  
Foreground simulation is for UI exercise only and is not valid background evidence.
