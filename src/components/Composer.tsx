/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSelectedModel } from '../state/AxonStateContext';
import { Plus, ChevronDown, Mic, ArrowUp, Check, Layers, Image as ImageIcon, Code2, Globe, Paperclip } from 'lucide-react';
import { ModelOption } from '../types';

interface ComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text: string) => void;
  isCompactMode: boolean;
  onToggleCompactMode: () => void;
  disabled?: boolean;
}

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'sonnet-5-thinking',
    name: 'Sonnet 5 Thinking',
    provider: 'Anthropic',
    badge: 'Default',
    description: 'High-reasoning foundation model with step reflection',
  },
  {
    id: 'opus-4-5',
    name: 'Opus 4.5',
    provider: 'Anthropic',
    description: 'Deep cognitive processing for extensive architecture',
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    description: 'Fast hybrid thinking & adaptive tool generation',
  },
  {
    id: 'gpt-5-omni',
    name: 'GPT-5 Omni',
    provider: 'OpenAI',
    description: 'Multimodal cross-domain synthesis model',
  },
  {
    id: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google DeepMind',
    description: 'Extended million-token context window reasoning',
  },
];

export const Composer: React.FC<ComposerProps> = ({
  input,
  setInput,
  onSend,
  isCompactMode,
  onToggleCompactMode,
  disabled = false,
}) => {
  // Stage 1C-iii: selectedModel via state root
  const { selectedModel, setSelectedModel } = useSelectedModel();

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const hasText = input.trim().length > 0;

  // Auto-resize textarea smoothly without altering container geometry
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${Math.max(newHeight, 26)}px`;
    }
  }, [input]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setIsAttachmentOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasText || disabled) return;
    const textToSend = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '26px';
    }
    onSend(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceClick = () => {
    // UI foundation notice: Truthful notice that AXON voice intelligence connects with future brain
    setVoiceNotice('Spoken audio engine is staged. The AXON voice pipeline connects in Phase 2.');
    setTimeout(() => {
      setVoiceNotice(null);
    }, 3200);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none pb-4 px-4 sm:px-6">
      <div className="max-w-[720px] mx-auto w-full flex flex-col items-end pointer-events-auto">
        {/* Persistent Indicator Pill Above Composer */}
        <div className="flex items-center justify-end w-full mb-2 pr-1">
          <button
            onClick={onToggleCompactMode}
            title={isCompactMode ? 'Standard Layout' : 'Toggle Pane View'}
            aria-label="Toggle pane layout"
            className="group flex items-center justify-center w-7 h-5 rounded-[5px] bg-[#232428] hover:bg-[#2C2D32] border border-white/10 transition-colors shadow-sm focus-visible:ring-1 focus-visible:ring-white/30"
          >
            {/* Split pane / sidebar toggle glyph matching reference images */}
            <div className="w-3.5 h-2.5 rounded-[2px] border border-[#A0A2A7] group-hover:border-white flex overflow-hidden">
              <div className={`h-full transition-all ${isCompactMode ? 'w-2 bg-[#E85A3C]' : 'w-1.5 bg-[#A0A2A7] group-hover:bg-white'}`} />
              <div className="flex-1 h-full bg-transparent" />
            </div>
          </button>
        </div>

        {/* Voice status toast */}
        {voiceNotice && (
          <div className="w-full mb-2 px-4 py-2 rounded-xl bg-[#232428]/95 border border-[#E85A3C]/30 text-xs text-[#D8DADC] shadow-xl backdrop-blur-md flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E85A3C] animate-pulse" />
              {voiceNotice}
            </span>
            <button
              onClick={() => setVoiceNotice(null)}
              className="text-[#9A9B9F] hover:text-white ml-2 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Persistent Anchored Composer Bubble */}
        <div className="w-full bg-[#1E1F22] rounded-[26px] p-3 border border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-xl transition-all">
          {/* Top Row: Input Field */}
          <div className="px-1.5 pt-0.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AXON..."
              aria-label="Message AXON"
              className="w-full bg-transparent text-[#ECECEC] placeholder-[#8E9094] text-[15px] font-normal leading-relaxed outline-none resize-none overflow-y-auto max-h-[120px]"
            />
          </div>

          {/* Bottom Row: Persistent Controls */}
          <div className="flex items-center justify-between pt-2">
            {/* Left Controls: Plus Button & Model Selector Pill */}
            <div className="flex items-center gap-2">
              {/* Plus Button */}
              <div className="relative" ref={attachMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                  aria-label="Add attachment or action"
                  className="w-9 h-9 rounded-full bg-[#2C2D30] hover:bg-[#36373B] text-[#D0D2D6] hover:text-white flex items-center justify-center transition-all active:scale-95"
                >
                  <Plus size={18} strokeWidth={2.2} />
                </button>

                {/* Attachment popover */}
                {isAttachmentOpen && (
                  <div className="absolute bottom-11 left-0 w-48 py-1.5 bg-[#1C1D21] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-50 text-xs">
                    <button
                      onClick={() => setIsAttachmentOpen(false)}
                      className="w-full text-left px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-[#E0E2E6]"
                    >
                      <Paperclip size={14} className="text-[#9A9B9F]" />
                      <span>Upload Document</span>
                    </button>
                    <button
                      onClick={() => setIsAttachmentOpen(false)}
                      className="w-full text-left px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-[#E0E2E6]"
                    >
                      <ImageIcon size={14} className="text-[#9A9B9F]" />
                      <span>Upload Image</span>
                    </button>
                    <button
                      onClick={() => setIsAttachmentOpen(false)}
                      className="w-full text-left px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-[#E0E2E6]"
                    >
                      <Code2 size={14} className="text-[#9A9B9F]" />
                      <span>Code Snippet</span>
                    </button>
                    <button
                      onClick={() => setIsAttachmentOpen(false)}
                      className="w-full text-left px-3.5 py-2 hover:bg-white/5 flex items-center gap-2.5 text-[#E0E2E6]"
                    >
                      <Globe size={14} className="text-[#9A9B9F]" />
                      <span>Web Grounding</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Model Selector Pill */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  aria-label="Select AI Model"
                  className="h-8 px-3 rounded-full bg-[#2A2B2E] hover:bg-[#343539] text-[#ECECEC] text-xs font-medium flex items-center gap-1.5 transition-all border border-transparent hover:border-white/5"
                >
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{selectedModel}</span>
                  <ChevronDown size={13} className={`text-[#9A9B9F] transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Model dropdown popover */}
                {isModelDropdownOpen && (
                  <div className="absolute bottom-11 left-0 w-72 p-1.5 bg-[#1C1D21] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-50 text-xs">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-[#8E9094] uppercase tracking-wider">
                      Target Architecture (UI Foundation)
                    </div>
                    {AVAILABLE_MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model.name);
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                          selectedModel === model.name
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-[#C5C7CB] hover:bg-white/5'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[13px]">{model.name}</span>
                          <span className="text-[11px] text-[#7A7C82]">{model.description}</span>
                        </div>
                        {selectedModel === model.name && (
                          <Check size={14} className="text-[#E85A3C] shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                    <div className="mt-1 pt-1.5 border-t border-white/5 px-3 py-1 text-[11px] text-[#707277] italic">
                      Foundation Mode: External AI models are decoupled from the UI body.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Controls: Microphone & Persistent Circular Action Button */}
            <div className="flex items-center gap-1.5">
              {/* Microphone Button */}
              <button
                type="button"
                onClick={handleVoiceClick}
                aria-label="Spoken microphone input"
                className="w-9 h-9 rounded-full text-[#9B9DA2] hover:text-white hover:bg-white/5 flex items-center justify-center transition-all active:scale-95"
              >
                <Mic size={19} strokeWidth={2} />
              </button>

              {/* Persistent Voice / Send Dual-State Circular Button */}
              {/* Stable geometry: 40px x 40px circle, solid white bg, black icon */}
              <button
                type="button"
                onClick={hasText ? () => handleSubmit() : handleVoiceClick}
                disabled={disabled}
                aria-label={hasText ? 'Send message' : 'Voice conversation'}
                className="w-10 h-10 rounded-full bg-white text-black hover:bg-[#F2F2F2] flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-[#E85A3C]"
              >
                {hasText ? (
                  // Send State (Arrow Up)
                  <ArrowUp size={19} strokeWidth={2.5} className="animate-in zoom-in-75 duration-150" />
                ) : (
                  // Voice State (Sound wave bars icon matching reference images)
                  <div className="flex items-center gap-[2.5px] h-4">
                    <span className="w-[2px] h-2 bg-black rounded-full" />
                    <span className="w-[2px] h-3.5 bg-black rounded-full" />
                    <span className="w-[2px] h-4 bg-black rounded-full" />
                    <span className="w-[2px] h-2.5 bg-black rounded-full" />
                    <span className="w-[2px] h-1.5 bg-black rounded-full" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
