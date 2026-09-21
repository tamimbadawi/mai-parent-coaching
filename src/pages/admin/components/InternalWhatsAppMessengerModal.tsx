import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { COUNTRIES } from '../../../data/countries';
import { getDialCodeForCountry } from '../../../components/ui/PhoneInput';
import type { CustomerJourneyState } from '../../../types';

interface InternalWhatsAppMessengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: CustomerJourneyState;
  onMessageSent?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'client' | 'admin';
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  triggerType?: string;
  errorMessage?: string | null;
}

export const normalizePhoneForWhatsApp = (
  phone: string | null | undefined,
  countryIsoOrName?: string | null
): string => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (phone.trim().startsWith('+')) {
    return `+${digits}`;
  }

  const dialCode = getDialCodeForCountry(countryIsoOrName) || '+20';
  const cleanDial = dialCode.replace(/\D/g, '');

  if (digits.startsWith(cleanDial) && digits.length > cleanDial.length + 6) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  return `+${cleanDial}${digits}`;
};

export default function InternalWhatsAppMessengerModal({
  isOpen,
  onClose,
  client,
  onMessageSent,
}: InternalWhatsAppMessengerModalProps): JSX.Element | null {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const normalizedPhone = useMemo(() => {
    return normalizePhoneForWhatsApp(client.phone, client.country);
  }, [client.phone, client.country]);

  const countryObj = useMemo(() => {
    if (!client.country) return null;
    return (
      COUNTRIES.find(
        (c) => c.iso === client.country || c.name.toLowerCase() === client.country?.toLowerCase()
      ) ?? null
    );
  }, [client.country]);

  // Generate phone search variants
  const phoneVariants = useMemo(() => {
    const raw = client.phone ? client.phone.trim() : '';
    const clean = raw.replace(/\D/g, '');
    const norm = normalizedPhone ? normalizedPhone.replace(/\D/g, '') : '';
    const variants = new Set<string>();

    if (raw) variants.add(raw);
    if (clean) {
      variants.add(clean);
      variants.add(`+${clean}`);
      if (clean.startsWith('0')) {
        variants.add(clean.slice(1));
      }
    }
    if (norm) {
      variants.add(norm);
      variants.add(`+${norm}`);
    }

    return Array.from(variants);
  }, [client.phone, normalizedPhone]);

  const fetchMessages = async (isSilent = false) => {
    if (!phoneVariants.length) {
      setMessages([]);
      setLoading(false);
      return;
    }

    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .in('recipient_phone', phoneVariants)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch messages for internal messenger:', error);
      } else if (data) {
        const formatted: ChatMessage[] = data.map((msg) => {
          const isClient = msg.message_type === 'inbound';
          return {
            id: msg.id,
            sender: isClient ? 'client' : 'admin',
            content: msg.message_content || '',
            status: (msg.status as ChatMessage['status']) || 'sent',
            timestamp: msg.sent_at || msg.created_at,
            triggerType: msg.message_type,
            errorMessage: msg.error_message,
          };
        });
        setMessages(formatted);
      }
    } catch (err) {
      console.error('Internal messenger fetch exception:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchMessages();
      setSendError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, client.client_id, client.phone]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    const phoneToUse = normalizedPhone || client.phone;
    if (!phoneToUse) {
      setSendError('Client does not have a valid phone number on file.');
      return;
    }

    setSending(true);
    setSendError(null);

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      sender: 'admin',
      content: text,
      status: 'pending',
      timestamp: new Date().toISOString(),
      triggerType: 'manual',
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-dispatcher', {
        body: {
          trigger: 'manual',
          recipient_phone: phoneToUse,
          recipient_name: client.parent_name,
          client_id: client.client_id,
          message_content: text,
        },
      });

      if (error || (data && !data.success && !data.skipped)) {
        const errorMsg = error?.message || data?.error || 'Failed to dispatch WhatsApp message.';
        setSendError(errorMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: 'failed', errorMessage: errorMsg } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
        );
        onMessageSent?.();
        setTimeout(() => {
          void fetchMessages(true);
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setSendError(msg);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', errorMessage: msg } : m))
      );
    } finally {
      setSending(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const formatMessageTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const formatMessageDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) return 'Today';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const desktopAppUrl = normalizedPhone
    ? `whatsapp://send?phone=${normalizedPhone.replace(/\D/g, '')}`
    : null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-charcoal/70 p-3 sm:p-5 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl h-[90vh] max-h-[700px] flex flex-col rounded-3xl border border-beige bg-white shadow-2xl overflow-hidden animate-fade-in">
        {/* Messenger Header */}
        <div className="flex items-center justify-between border-b border-beige/80 bg-[#f7f5f0] px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-serif font-bold text-sm shadow-xs shrink-0">
              {client.parent_name ? client.parent_name[0].toUpperCase() : 'C'}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-medium text-charcoal truncate">
                  {client.parent_name}
                </h3>
                {countryObj && <span className="text-sm shrink-0">{countryObj.flag}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-warm-gray">
                <span className="font-mono text-emerald-800 font-medium">
                  {normalizedPhone || client.phone || 'No phone'}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Internal WhatsApp Gateway
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void fetchMessages(true)}
              disabled={refreshing}
              title="Refresh messages"
              className="rounded-xl p-2 text-warm-gray hover:bg-beige/50 hover:text-charcoal transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {desktopAppUrl && (
              <a
                href={desktopAppUrl}
                title="Open in WhatsApp Desktop App"
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition border border-emerald-200/60"
              >
                <Phone className="h-3 w-3" />
                <span className="hidden sm:inline">Desktop App</span>
                <ExternalLink className="h-2.5 w-2.5 text-emerald-700/70" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-warm-gray hover:bg-beige/50 hover:text-charcoal transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Error notification banner */}
        {sendError && (
          <div className="flex items-center justify-between bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{sendError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSendError(null)}
              className="p-1 hover:text-rose-950 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]/60">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-warm-gray py-12">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-xs">Loading conversation history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-warm-gray">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100/70 text-emerald-700 mb-3 shadow-xs">
                <MessageCircle className="h-7 w-7" />
              </div>
              <h4 className="font-serif text-sm font-medium text-charcoal">
                Direct WhatsApp Messenger
              </h4>
              <p className="text-xs text-warm-gray max-w-xs mt-1">
                No WhatsApp messages on record with {client.parent_name} yet. Send a direct message
                below to start the conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const prevMsg = messages[index - 1];
                const showDateDivider =
                  !prevMsg ||
                  formatMessageDate(prevMsg.timestamp) !== formatMessageDate(msg.timestamp);

                const isOutgoing = msg.sender === 'admin';

                return (
                  <div key={msg.id} className="space-y-2">
                    {showDateDivider && (
                      <div className="flex justify-center my-2">
                        <span className="rounded-full bg-white/80 border border-beige/60 px-3 py-0.5 text-[11px] font-medium text-warm-gray shadow-2xs">
                          {formatMessageDate(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-xs ${
                          isOutgoing
                            ? 'bg-[#d9fdd3] text-charcoal border border-emerald-200/50 rounded-tr-xs'
                            : 'bg-white text-charcoal border border-beige/60 rounded-tl-xs'
                        }`}
                      >
                        {/* Outbound trigger tag */}
                        {isOutgoing && msg.triggerType && msg.triggerType !== 'manual' && (
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-800/80 uppercase tracking-wider">
                            <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                            <span>{msg.triggerType.replace(/_/g, ' ')}</span>
                          </div>
                        )}

                        {/* Inbound sender label */}
                        {!isOutgoing && (
                          <div className="mb-1 text-[11px] font-semibold text-emerald-800">
                            {client.parent_name}
                          </div>
                        )}

                        <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed break-words">
                          {msg.content}
                        </p>

                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-warm-gray">
                          <span>{formatMessageTime(msg.timestamp)}</span>

                          {isOutgoing && (
                            <span className="shrink-0">
                              {msg.status === 'pending' ? (
                                <Clock className="h-3 w-3 text-warm-gray animate-pulse" />
                              ) : msg.status === 'failed' ? (
                                <span className="inline-flex items-center gap-0.5 text-rose-600" title={msg.errorMessage || 'Failed to deliver'}>
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Failed</span>
                                </span>
                              ) : msg.status === 'read' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-sky-500" title="Read" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-warm-gray" title="Delivered" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-warm-gray" title="Sent" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input Footer */}
        <form
          onSubmit={handleSendMessage}
          className="border-t border-beige/80 bg-white p-3 shrink-0 space-y-2"
        >
          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-2xl border border-beige/90 bg-[#faf8f4] focus-within:border-emerald-600 focus-within:bg-white transition px-3 py-2">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Send WhatsApp message to ${client.parent_name}...`}
                rows={2}
                disabled={sending}
                className="w-full resize-none bg-transparent text-xs text-charcoal outline-none placeholder:text-warm-gray/60 leading-relaxed"
              />
              <div className="flex items-center justify-between pt-1 border-t border-beige/40 text-[10px] text-warm-gray">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span>{inputText.length} chars</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Send WhatsApp message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
