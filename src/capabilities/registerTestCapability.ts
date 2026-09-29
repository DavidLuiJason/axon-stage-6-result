/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage 2 proof registration — one fake, harmless test capability.
 * No UI, no behavior beyond existing in the registry.
 * Real capabilities (Source, Tools, Capture, Settings, Build) are NOT
 * registered here; that is a later stage.
 */

import { registerCapability, listCapabilities } from './registry';

const TEST_CAPABILITY = {
  id: 'cap.test-example',
  displayName: 'Test Capability',
  contractVersion: '1.0.0',
  implementationVersion: '0.1.0',
} as const;

/**
 * Register the Stage 2 proof capability and log registry contents.
 * Call once at process/app startup — not from a React component body.
 */
export function registerTestCapability(): void {
  registerCapability({ ...TEST_CAPABILITY });
  const all = listCapabilities();
  // Verification signal: checkable in browser console without new UI
  console.log('[AXON capability registry] registered:', all);
}
