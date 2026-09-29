/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage 4B — register AXON Tools as a real capability.
 * Declarative architecture only: no UI mount coupling, no behavior change
 * to AxonToolsScreen.tsx.
 */

import { registerCapability, getCapability } from './registry';

const AXON_TOOLS_CAPABILITY = {
  id: 'cap.axon-tools',
  displayName: 'AXON Tools',
  contractVersion: '1.0.0',
  implementationVersion: '1.0.0',
} as const;

/**
 * Register the AXON Tools capability at app startup.
 * Call once — not from AxonToolsScreen mount/unmount.
 */
export function registerAxonToolsCapability(): void {
  registerCapability({ ...AXON_TOOLS_CAPABILITY });
  console.log(
    '[AXON capability registry] AXON Tools registered:',
    getCapability('cap.axon-tools')
  );
}
