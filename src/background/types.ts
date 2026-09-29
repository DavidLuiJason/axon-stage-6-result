/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage 6 — Background Execution Proof types.
 * Native foreground service owns the work; JS only displays.
 */

export type JobKind = 'counter' | 'steps';

export type HeartbeatEventType =
  | 'HEARTBEAT'
  | 'RESTARTED'
  | 'TIMEOUT'
  | 'STARTED'
  | 'STOPPED'
  | 'STEP';

export interface HeartbeatRecord {
  jobId: string;
  seq: number;
  wallClock: number;
  elapsedRealtime: number;
  batteryPercent: number | null;
  stepLabel: string;
  eventType: HeartbeatEventType;
  /** Present on RESTARTED: ms gap since last known heartbeat. */
  gapMs?: number;
  /** Counter value when jobKind is counter. */
  counterValue?: number;
}

export interface JobSnapshot {
  jobId: string | null;
  jobKind: JobKind | null;
  running: boolean;
  startWallClock: number | null;
  stepLabel: string;
  counterValue: number;
  serviceActive: boolean;
  heartbeats: HeartbeatRecord[];
}

export interface BackgroundCapabilities {
  canRunInBackground: boolean;
  platform: 'android-native' | 'web-fallback';
  reason: string;
}

export interface StartJobOptions {
  kind: JobKind;
  /** For steps job: ordered step labels. */
  steps?: string[];
}

export interface BackgroundExecutionAdapter {
  getCapabilities(): Promise<BackgroundCapabilities>;
  startJob(opts: StartJobOptions): Promise<{ jobId: string }>;
  stopJob(): Promise<void>;
  getSnapshot(): Promise<JobSnapshot>;
  /** Subscribe to snapshot updates (heartbeats). Returns unsubscribe. */
  subscribe(cb: (snap: JobSnapshot) => void): () => void;
  requestNotificationPermission(): Promise<boolean>;
  openBatteryOptimizationSettings(): Promise<void>;
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  exportDiagnostics(): Promise<string>;
}
