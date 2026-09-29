/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage 6 — Capacitor configuration for AXON Android wrapper.
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.axon.app',
  appName: 'AXON',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    BackgroundJobs: {
      // Custom plugin — no extra config keys required.
    },
  },
};

export default config;
