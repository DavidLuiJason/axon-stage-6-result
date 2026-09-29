/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AXON Brain Interface Boundary
 * 
 * Strict architectural abstraction separating the AXON visual/functional body
 * from future intelligence orchestrators.
 * 
 * NOTE: The AXON intelligence layer is intentionally not online during this
 * foundation phase. No background calls to Gemini or external LLMs are made.
 */

import { ChatMessage } from '../types';

export interface BrainStatus {
  isOnline: boolean;
  phase: string;
  version: string;
}

export const getAxonBrainStatus = (): BrainStatus => {
  return {
    isOnline: false,
    phase: 'Foundation Body (Phase 1)',
    version: '1.0.0-foundation',
  };
};

/**
 * Dispatches a user query to the AXON intelligence boundary.
 * Returns a calm, truthful response explaining that the environment foundation is established
 * and awaiting future brain integration.
 */
export async function sendQueryToAxonBoundary(
  userInput: string,
  modelName: string
): Promise<ChatMessage> {
  // Artificial human-like brief settling pause (200-400ms) without any background network requests
  await new Promise((resolve) => setTimeout(resolve, 350));

  const trimmed = userInput.trim();
  const lower = trimmed.toLowerCase();

  // If asking about the layout / UI (as in reference Image 3: "Describe Axon UI Layout")
  if (lower.includes('axon ui') || lower.includes('layout') || lower.includes('describe axon')) {
    return {
      id: `axon-${Date.now()}`,
      role: 'assistant',
      content: `The AXON interface is built upon a calm, minimal foundation designed to eliminate scattered dashboard clutter. It anchors three persistent interface zones:\n\n1. Fixed Top Controls: Menu trigger, anchored AXON brand selector, and contextual overflow.\n2. Independent Scrolling Viewport: Generous typography for clean discourse without heavy card-in-card containers.\n3. Anchored Adaptive Composer: Persistent bottom bubble holding model selector, audio controls, and unified voice/send transitions.`,
      leadParagraph: `The AXON interface is built upon a calm, minimal foundation designed to eliminate scattered dashboard clutter. It anchors three persistent interface zones:`,
      planItems: [
        'Fixed Top Controls: Menu trigger, anchored AXON brand selector, and contextual overflow.',
        'Independent Scrolling Viewport: Generous typography for clean discourse without heavy card-in-card containers.',
        'Anchored Adaptive Composer: Persistent bottom bubble holding model selector, audio controls, and unified voice/send transitions.',
      ],
      hasSources: true,
      suggestionPrompt: 'Would you like to explore the navigation drawer structure or inspect the persistent composer tokens?',
      timestamp: Date.now(),
    };
  }

  // Standard truthful, polished response for any user message during the foundation phase
  return {
    id: `axon-${Date.now()}`,
    role: 'assistant',
    content: `I'm here, but AXON's intelligence layer isn't online yet. We're building the environment first. Once the AXON brain is connected, I'll be able to process and respond to your requests directly with ${modelName}.`,
    leadParagraph: `I'm here, but AXON's intelligence layer isn't online yet. We're building the environment first. Once the AXON brain is connected, I'll be able to process and respond to your requests directly with ${modelName}.`,
    planIntro: `During this foundation phase, the body and design system are fully active:`,
    planItems: [
      'Responsive anchored framing and layout stability.',
      'Independent conversation stream and typography.',
      'Persistent adaptive composer with model configuration.',
      'Navigation drawer hierarchy and system options.',
    ],
    hasSources: false,
    suggestionPrompt: 'Would you like to review the established design tokens or test the drawer navigation?',
    timestamp: Date.now(),
  };
}
