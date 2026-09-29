/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage 3 proof registration — one fake, harmless test interface.
 * No UI. Real screens are NOT registered here (Stage 4).
 */

import { registerInterface, listInterfaces, getInterfaceTree } from './registry';

const TEST_INTERFACE = {
  interfaceId: 'iface.test-example',
  displayName: 'Test Interface',
  parentId: null as null,
  kind: 'screen' as const,
  isNavigable: false,
};

/**
 * Register the Stage 3 proof interface and log registry + tree.
 * Call once at app startup — not from a React component body.
 */
export function registerTestInterface(): void {
  registerInterface({ ...TEST_INTERFACE });
  const all = listInterfaces();
  const tree = getInterfaceTree(null);
  console.log('[AXON interface registry] registered:', all);
  console.log('[AXON interface registry] tree:', tree);
}
