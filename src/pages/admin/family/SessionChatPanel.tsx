import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Send, Loader2, User, Bot, Copy, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { SessionChatMessage } from '../../../types/family';

const SUGGESTED_PROMPTS = [
  'Summarize emotional triggers identified so far',
  'Draft a supportive follow-up WhatsApp message',
  'What recurring patterns appear across sessions?',
];

interface SessionChatPanelProps {
  householdId: string;
  sessionId: string;
  familyName: string;
}

export const SessionChatPanel = ({ householdId, sessionId, familyName }: SessionChatPanelProps): JSX.Element => {
  const [messages, setMessages] = useState<SessionChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('session_chat_messages')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? []);
        setLoading(false);
      });
  }, [householdId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const handleSend = async (text?: string): Promise<void> => {
    const messageText = (text ?? inputText).trim();
    if (!messageText || sending) return;
    setInputText('');
    setError(null);
    setSending(true);

    const optimisticAdmin: SessionChatMessage = {
      id: `optimistic-${Date.now()}`,
      household_id: householdId,
      session_id: sessionId,
      sender: 'admin',
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticAdmin]);

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('session-chat', {
        body: { householdId, sessionId, message: messageText },
      });
      if (invokeErr) throw invokeErr;
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          household_id: householdId,
          session_id: sessionId,
          sender: 'assistant',
          content: data.reply,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'The assistant is temporarily unavailable.');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = (text: string, id: string): void => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-beige/80 shadow-xs flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <div className="border-b border-beige/70 bg-[#faf8f4]/60 px-4 py-2.5 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-charcoal leading-tight">Session Intelligence</h3>
          <p className="text-[10px] text-charcoal/60 leading-tight">Context-scoped to {familyName}</p>
        </div>
      </div>

      <div ref={scrollRef} className="p-3 sm:p-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0 space-y-3 text-charcoal">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-charcoal/50">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-beige/70 bg-[#faf8f4] p-4 text-xs text-charcoal/70 leading-relaxed">
            Ask about {familyName}'s sessions — I only use what's actually recorded, and I won't apply a clinical framework unless
            one has been configured for this practice.
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender === 'admin';
            return (
              <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} space-y-1`}>
                <div className="flex items-center gap-1.5 px-1">
                  {isAdmin ? (
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-charcoal/50 flex items-center gap-1">
                      <User className="w-3 h-3" /> Mai
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-sage-dark flex items-center gap-1">
                      <Bot className="w-3 h-3" /> Assistant
                    </span>
                  )}
                  <span className="text-[10px] text-charcoal/40 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`group relative max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isAdmin
                      ? 'bg-[#1f1c1d] text-white rounded-tr-xs shadow-xs'
                      : 'bg-[#faf8f4] text-charcoal border border-beige/80 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  {!isAdmin && (
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="absolute top-2.5 right-2.5 p-1 rounded-md bg-white/80 border border-beige/70 text-charcoal/50 hover:text-charcoal opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <div className="prose prose-stone max-w-none text-inherit text-xs sm:text-sm">
                    <ReactMarkdown
                      components={{
                        p: (props) => <p className={`mb-2 last:mb-0 ${isAdmin ? 'text-white' : 'text-charcoal/90'}`} {...props} />,
                        ul: (props) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                        li: (props) => <li className={isAdmin ? 'text-white/90' : 'text-charcoal/85'} {...props} />,
                        strong: (props) => <strong className={`font-semibold ${isAdmin ? 'text-white' : 'text-charcoal'}`} {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {sending && (
          <div className="flex items-center gap-2 text-charcoal/60 text-xs py-2 px-1">
            <Bot className="w-4 h-4 text-sage-dark animate-pulse" />
            <span>Reading session context...</span>
          </div>
        )}
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}
      </div>

      {messages.length === 0 && !loading ? (
        <div className="px-3 py-2 bg-[#faf8f4]/80 border-t border-beige/60 flex flex-wrap gap-1.5 shrink-0">
          {SUGGESTED_PROMPTS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSend(chip)}
              className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-white border border-beige/80 text-charcoal/80 hover:border-sage-dark/60 hover:bg-sage/10 transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="p-2.5 border-t border-beige/70 bg-white flex items-end gap-2 shrink-0"
      >
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Ask about this family, draft follow-ups, or compare sessions..."
          rows={1}
          className="flex-1 resize-none py-2 px-3 text-xs sm:text-sm rounded-xl bg-ivory border border-beige/80 focus:outline-hidden focus:border-sage-dark placeholder:text-charcoal/40 max-h-24 min-h-[38px]"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="w-9 h-9 rounded-xl bg-charcoal text-white hover:bg-charcoal/90 disabled:opacity-40 flex items-center justify-center shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};

export default SessionChatPanel;
