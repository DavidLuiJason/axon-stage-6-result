/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage 4B — register AXON Tools as a real interface.
 * Declarative architecture only: no UI mount coupling, no behavior change
 * to AxonToolsScreen.tsx.
 *
 * isNavigable: true — unlike Settings (modal + isSettingsModalOpen), AXON
 * Tools is reached via the currentScreen router (currentScreen ===
 * 'axon-tools'). Under this contract it is a direct navigation destination.
 */

import { registerInterface, getInterface } from './registry';

const AXON_TOOLS_INTERFACE = {
  interfaceId: 'iface.axon-tools',
  displayName: 'AXON Tools',
  parentId: null as null,
  kind: 'screen' as const,
  isNavigable: true,
};

/**
 * Register the AXON Tools interface at app startup.
 * Call once — not from AxonToolsScreen mount/unmount.
 */
export function registerAxonToolsInterface(): void {
  registerInterface({ ...AXON_TOOLS_INTERFACE });
  console.log(
    '[AXON interface registry] AXON Tools registered:',
    getInterface('iface.axon-tools')
  );
}
