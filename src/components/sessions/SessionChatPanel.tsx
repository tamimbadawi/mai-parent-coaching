import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Loader2,
  RefreshCw,
  User,
  Bot,
  ArrowRight,
  MessageCircle,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import type { ChatMessage } from '../../types/session';

interface SessionChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  error: string | null;
  isMockMode: boolean;
  clientName: string;
  onSendMessage: (message: string) => void;
  onClearChat?: () => void;
  onToggleMockMode?: (val: boolean) => void;
}

export const SessionChatPanel: React.FC<SessionChatPanelProps> = ({
  messages,
  isGenerating,
  error,
  isMockMode,
  clientName,
  onSendMessage,
  onClearChat,
  onToggleMockMode,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll chat container to bottom without scrolling window
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get suggested chips from the latest assistant message
  const latestGeminiMsg = [...messages].reverse().find((m) => m.sender === 'gemini');
  const suggestedFollowUps = latestGeminiMsg?.suggestedFollowUps || [];

  return (
    <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-beige/80 shadow-xs flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-beige/70 bg-[#faf8f4]/60 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-charcoal flex items-center gap-1.5 leading-tight">
              <span>Session Intelligence</span>
            </h3>
            <p className="text-[10px] text-charcoal/60 leading-tight">
              Context-scoped to {clientName}
            </p>
          </div>
        </div>

        {/* Mock Mode Indicator */}
        <div className="flex items-center gap-2">
          {onToggleMockMode && (
            <button
              onClick={() => onToggleMockMode(!isMockMode)}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-beige/80 bg-white text-charcoal/70 hover:text-charcoal transition-colors"
              title="Toggle between Simulated and Live Mode"
            >
              {isMockMode ? 'Mode: Simulated' : 'Mode: Live'}
            </button>
          )}

          {onClearChat && (
            <button
              onClick={onClearChat}
              className="text-[11px] text-charcoal/50 hover:text-charcoal transition-colors p-1"
              title="Reset conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={chatContainerRef} className="p-3 sm:p-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0 space-y-3 text-charcoal">
        {messages.map((msg) => {
          const isUser = msg.sender === 'admin';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center gap-1.5 px-1">
                {isUser ? (
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-charcoal/50 flex items-center gap-1">
                    <User className="w-3 h-3 text-charcoal/60" /> Mai (Admin)
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-sage-dark flex items-center gap-1">
                    <Bot className="w-3 h-3" /> Clinical Assistant
                  </span>
                )}
                <span className="text-[10px] text-charcoal/40 font-mono">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div
                className={`group relative max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed transition-all ${
                  isUser
                    ? 'bg-[#1f1c1d] text-white rounded-tr-xs shadow-xs'
                    : 'bg-[#faf8f4] text-charcoal border border-beige/80 rounded-tl-xs shadow-2xs'
                }`}
              >
                {/* Copy button */}
                {!isUser && (
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="absolute top-2.5 right-2.5 p-1 rounded-md bg-white/80 border border-beige/70 text-charcoal/50 hover:text-charcoal opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy to clipboard"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {/* Message Body */}
                <div className="prose prose-stone max-w-none text-inherit text-xs sm:text-sm">
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p className={`mb-2 last:mb-0 ${isUser ? 'text-white' : 'text-charcoal/90'}`} {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc pl-4 space-y-1 my-2" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className={`${isUser ? 'text-white/90' : 'text-charcoal/85'}`} {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className={`font-semibold ${isUser ? 'text-white' : 'text-charcoal'}`} {...props} />
                      ),
                      hr: ({ node, ...props }) => (
                        <hr className="my-3 border-beige/60" {...props} />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="w-full text-[11px] border border-beige/80 rounded-lg overflow-hidden" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="bg-beige/40 p-1.5 text-left font-semibold border-b border-beige/80" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="p-1.5 border-b border-beige/50" {...props} />
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}

        {/* Generating Indicator */}
        {isGenerating && (
          <div className="flex items-center gap-2 text-charcoal/60 text-xs py-2 px-1 animate-pulse">
            <Bot className="w-4 h-4 text-sage-dark animate-spin" />
            <span>Reading session context & reasoning...</span>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Suggested Prompt Chips - Wrapped cleanly with zero horizontal scroll */}
      {suggestedFollowUps.length > 0 && !isGenerating && (
        <div className="px-3 py-1.5 bg-[#faf8f4]/80 border-t border-beige/60 flex flex-wrap items-center gap-1.5 shrink-0 overflow-hidden">
          <span className="text-[10px] text-charcoal/50 font-medium shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Prompts:
          </span>
          {suggestedFollowUps.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(chip)}
              className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-white border border-beige/80 text-charcoal/80 hover:text-charcoal hover:border-sage-dark/60 hover:bg-sage/10 transition-all text-left max-w-full truncate"
              title={chip}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Form - Always visible with shrink-0 and compact padding */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 border-t border-beige/70 bg-white flex items-end gap-2 shrink-0"
      >
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this session, draft follow-ups, or compare notes..."
          rows={1}
          className="flex-1 resize-none py-2 px-3 text-xs sm:text-sm rounded-xl bg-ivory border border-beige/80 focus:outline-hidden focus:border-sage-dark placeholder:text-charcoal/40 transition-colors max-h-24 min-h-[38px]"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isGenerating}
          className="w-9 h-9 rounded-xl bg-charcoal text-white hover:bg-charcoal/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0 shadow-2xs"
          title="Send message (Enter)"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </button>
      </form>
    </div>
  );
};
