import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  PowerOff,
  QrCode,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Clock,
  Send,
  ServerOff,
  Loader2,
  Search,
  Filter,
  Eye,
  Calendar,
  Phone,
  User,
  X,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Sliders,
  Check,
  BookOpen,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { Panel, StatCard } from './components/AdminUI';
import ContentLibraryStudio from './components/ContentLibraryStudio';
import PhoneInput, { getDialCodeForCountry, parsePhone } from '../../components/ui/PhoneInput';
import {
  fetchWhatsAppStatus,
  fetchWhatsAppQr,
  resetWhatsAppSession,
  fetchWhatsAppMessages,
  dispatchWhatsAppMessage,
  triggerWhatsAppScheduler,
  fetchWhatsAppAutomationRules,
  updateWhatsAppAutomationRule,
  type WhatsAppStatusResponse,
  type WhatsAppQrResponse,
  type WhatsAppMessage,
  type WhatsAppMessageType,
  type WhatsAppAutomationRule,
} from '../../lib/whatsappAdmin';

export default function AdminWhatsApp(): JSX.Element {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'history' | 'rules' | 'crm_library' | 'connection'>('history');

  // Connection & pairing states
  const [statusData, setStatusData] = useState<WhatsAppStatusResponse | null>(null);
  const [qrData, setQrData] = useState<WhatsAppQrResponse | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Disconnect modal states
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // Message history states
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState<boolean>(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // Modals
  const [selectedMessage, setSelectedMessage] = useState<WhatsAppMessage | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualPhone, setManualPhone] = useState<string>('');
  const [manualText, setManualText] = useState<string>('');
  const [isSendingManual, setIsSendingManual] = useState<boolean>(false);
  const [manualSendResult, setManualSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Manual modal recipient search states
  const [recipientMode, setRecipientMode] = useState<'search' | 'direct'>('search');
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [userSearchResults, setUserSearchResults] = useState<Array<{
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    country?: string | null;
    role?: string;
  }>>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    country?: string | null;
    role?: string;
  } | null>(null);

  // Scheduler execution states
  const [isRunningScheduler, setIsRunningScheduler] = useState<boolean>(false);
  const [schedulerFeedback, setSchedulerFeedback] = useState<string | null>(null);

  // Automation rules states
  const [rules, setRules] = useState<WhatsAppAutomationRule[]>([]);
  const [isRulesLoading, setIsRulesLoading] = useState<boolean>(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, { template_content: string; is_enabled: boolean }>>({});
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [ruleSaveSuccessId, setRuleSaveSuccessId] = useState<string | null>(null);

  // Polling ref to safely clear interval on unmount or tab hide
  const pollTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const formatUptime = (seconds?: number): string => {
    if (typeof seconds !== 'number' || seconds <= 0) return 'Just started';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(' ');
  };

  // Primary status loader
  const loadStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const result = await fetchWhatsAppStatus();
      if (!isMountedRef.current) return;

      if (result.error || !result.data) {
        setErrorMessage(result.error || 'Failed to fetch WhatsApp service status');
        setErrorCode(result.code || 'STATUS_FETCH_FAILED');
        setStatusData(null);
      } else {
        setStatusData(result.data);
        setErrorMessage(null);
        setErrorCode(null);
        setLastRefreshedAt(new Date());

        if (result.data.client.state === 'QR_READY' || result.data.client.hasQr) {
          void loadQr();
        } else {
          setQrData(null);
          setQrError(null);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // QR loader
  const loadQr = useCallback(async () => {
    try {
      const result = await fetchWhatsAppQr();
      if (isMountedRef.current) {
        if (result.data && result.data.status === 'ok' && result.data.qr) {
          setQrData(result.data);
          setQrError(null);
        } else {
          setQrData(null);
          setQrError(result.error || result.data?.message || 'Pairing code is temporarily unavailable.');
        }
      }
    } catch {
      if (isMountedRef.current) {
        setQrData(null);
        setQrError('Pairing code is temporarily unavailable.');
      }
    }
  }, []);

  // Message history loader
  const loadMessages = useCallback(async () => {
    setIsMessagesLoading(true);
    setMessagesError(null);
    try {
      const res = await fetchWhatsAppMessages({
        status: statusFilter,
        type: typeFilter,
        search: debouncedSearchQuery,
      });
      if (!isMountedRef.current) return;
      if (res.error) {
        setMessagesError(res.error);
        setMessages([]);
      } else {
        setMessages(res.data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setMessagesError(err instanceof Error ? err.message : 'Failed to load messages');
      }
    } finally {
      if (isMountedRef.current) {
        setIsMessagesLoading(false);
        setHasLoadedOnce(true);
      }
    }
  }, [statusFilter, typeFilter, debouncedSearchQuery]);

  // 300ms debounce on search input
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  // Automation rules loader
  const loadRules = useCallback(async () => {
    setIsRulesLoading(true);
    setRulesError(null);
    try {
      const res = await fetchWhatsAppAutomationRules();
      if (!isMountedRef.current) return;
      if (res.error) {
        setRulesError(res.error);
      } else {
        setRules(res.data || []);
        const drafts: Record<string, { template_content: string; is_enabled: boolean }> = {};
        for (const r of res.data || []) {
          drafts[r.id] = { template_content: r.template_content, is_enabled: r.is_enabled };
        }
        setRuleDrafts(drafts);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setRulesError(err instanceof Error ? err.message : 'Failed to load automation rules');
      }
    } finally {
      if (isMountedRef.current) {
        setIsRulesLoading(false);
      }
    }
  }, []);

  const handleSaveRule = async (ruleId: string) => {
    const draft = ruleDrafts[ruleId];
    if (!draft) return;
    setSavingRuleId(ruleId);
    try {
      const res = await updateWhatsAppAutomationRule(ruleId, {
        template_content: draft.template_content,
        is_enabled: draft.is_enabled,
      });
      if (!isMountedRef.current) return;
      if (res.error) {
        alert(`Failed to save template: ${res.error}`);
      } else {
        setRuleSaveSuccessId(ruleId);
        setTimeout(() => {
          if (isMountedRef.current) setRuleSaveSuccessId(null);
        }, 2500);
        setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, ...draft } : r)));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      if (isMountedRef.current) {
        setSavingRuleId(null);
      }
    }
  };

  const handleToggleRule = async (rule: WhatsAppAutomationRule) => {
    const newEnabled = !rule.is_enabled;
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_enabled: newEnabled } : r)));
    setRuleDrafts((prev) => ({
      ...prev,
      [rule.id]: {
        ...(prev[rule.id] || { template_content: rule.template_content }),
        is_enabled: newEnabled,
      },
    }));

    const res = await updateWhatsAppAutomationRule(rule.id, { is_enabled: newEnabled });
    if (res.error) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_enabled: rule.is_enabled } : r)));
      alert(`Failed to update toggle: ${res.error}`);
    }
  };

  // Initial loads and lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    void loadStatus(false);
    void loadMessages();
    void loadRules();

    const checkAndPoll = () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (document.hidden) return;

      pollTimerRef.current = window.setInterval(() => {
        if (!document.hidden && isMountedRef.current) {
          void loadStatus(true);
        }
      }, 7000);
    };

    checkAndPoll();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadStatus(true);
        void loadMessages();
        void loadRules();
      }
      checkAndPoll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [loadStatus, loadMessages, loadRules]);

  // Re-run message filter query when filters or debounced search query change
  useEffect(() => {
    void loadMessages();
  }, [statusFilter, typeFilter, debouncedSearchQuery, loadMessages]);

  // Session reset
  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      const result = await resetWhatsAppSession();
      if (!isMountedRef.current) return;
      if (result.error) {
        setDisconnectError(result.error);
        setIsDisconnecting(false);
      } else {
        setIsDisconnectModalOpen(false);
        setIsDisconnecting(false);
        await loadStatus(false);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setDisconnectError(err instanceof Error ? err.message : 'Disconnection request failed');
        setIsDisconnecting(false);
      }
    }
  };

  // Search profiles for manual modal recipient picker
  useEffect(() => {
    if (!isManualModalOpen || recipientMode !== 'search') return;

    let isCurrent = true;
    const term = userSearchTerm.trim();

    async function searchUsers() {
      setIsSearchingUsers(true);
      try {
        let q = supabase
          .from('profiles')
          .select('id, full_name, email, phone, country, role')
          .order('full_name', { ascending: true })
          .limit(10);

        if (term) {
          q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
        }

        const { data, error } = await q;
        if (isCurrent && !error) {
          setUserSearchResults((data as any[]) || []);
        }
      } catch {
        // ignore
      } finally {
        if (isCurrent) setIsSearchingUsers(false);
      }
    }

    const timer = window.setTimeout(searchUsers, 200);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [isManualModalOpen, recipientMode, userSearchTerm]);

  const handleSelectUser = (u: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    country?: string | null;
    role?: string;
  }) => {
    setSelectedUser(u);
    if (u.phone) {
      setManualPhone(u.phone);
    } else if (u.country) {
      const dial = getDialCodeForCountry(u.country);
      setManualPhone(dial || '+20');
    } else {
      setManualPhone('+20');
    }
  };

  const handleClearSelectedUser = () => {
    setSelectedUser(null);
    setManualPhone('+20');
    setUserSearchTerm('');
  };

  const handleOpenManualModal = () => {
    setIsManualModalOpen(true);
    setManualSendResult(null);
    if (!manualPhone) {
      setManualPhone('+20');
    }
  };

  // Manual message dispatch
  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const { dialCode, local } = parsePhone(manualPhone);
    const cleanedDigits = local.replace(/\D/g, '');
    if (!cleanedDigits || cleanedDigits.length < 6) {
      setManualSendResult({ success: false, message: 'Please enter a valid phone number with at least 6 digits.' });
      return;
    }
    if (!manualText.trim()) {
      setManualSendResult({ success: false, message: 'Please enter a message body.' });
      return;
    }

    const recipientPhone = `${dialCode}${cleanedDigits}`;
    setIsSendingManual(true);
    setManualSendResult(null);

    const res = await dispatchWhatsAppMessage({
      trigger: 'manual',
      recipient_phone: recipientPhone,
      recipient_name: selectedUser?.full_name || null,
      message_content: manualText.trim(),
    });

    setIsSendingManual(false);
    if (res.error) {
      setManualSendResult({ success: false, message: res.error });
    } else {
      setManualSendResult({ success: true, message: 'Message successfully dispatched and recorded.' });
      setManualText('');
      void loadMessages();
      void loadStatus(true);
      setTimeout(() => {
        setIsManualModalOpen(false);
        setManualSendResult(null);
        setSelectedUser(null);
        setUserSearchTerm('');
        setManualPhone('+20');
      }, 1500);
    }
  };

  // Manual trigger for reminder scheduler
  const handleRunScheduler = async () => {
    setIsRunningScheduler(true);
    setSchedulerFeedback(null);
    const res = await triggerWhatsAppScheduler();
    setIsRunningScheduler(false);

    if (res.error) {
      setSchedulerFeedback(`Scheduler error: ${res.error}`);
    } else {
      const r = res.data?.schedulerResults;
      const swept = r?.stalePendingSwept || 0;
      const s24 = r?.reminder_24h?.sent || 0;
      const s1 = r?.reminder_1h?.sent || 0;
      const sf = r?.follow_up?.sent || 0;
      setSchedulerFeedback(`Scheduler ran: ${s24} 24h reminders, ${s1} 1h reminders, ${sf} follow-ups sent. ${swept} stale swept.`);
      void loadMessages();
      void loadStatus(true);
      setTimeout(() => setSchedulerFeedback(null), 6000);
    }
  };

  // State derivations
  const clientState = statusData?.client?.state;
  const isConnected = clientState === 'READY' || statusData?.client?.ready === true;
  const isWaitingForQr = clientState === 'QR_READY' || (statusData?.client?.hasQr && !isConnected);
  const isServiceUnavailable = Boolean(errorMessage && !statusData);

  // Message stats calculations
  const totalSentCount = messages.filter((m) => m.status === 'sent').length;
  const totalFailedCount = messages.filter((m) => m.status === 'failed').length;
  const totalPendingCount = messages.filter((m) => m.status === 'pending').length;

  const getTypeBadge = (type: WhatsAppMessageType) => {
    switch (type) {
      case 'onboarding':
        return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/60">Onboarding</span>;
      case 'booking_confirmation':
        return <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">Confirmation</span>;
      case 'reminder_24h':
        return <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/60">24h Reminder</span>;
      case 'reminder_1h':
        return <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-200/60">1h Reminder</span>;
      case 'follow_up':
        return <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200/60">Follow-up</span>;
      case 'manual':
      default:
        return <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 border border-stone-200/60">Manual</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sent
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Failed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending
          </span>
        );
    }
  };

  return (
    <AdminLayout
      title="WhatsApp Automation"
      subtitle="Manage event-driven message dispatching, client notification history, and live device connection."
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenManualModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3.5 py-2 text-xs font-medium text-white hover:bg-sage-dark active:bg-sage-dark transition shadow-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send Message</span>
          </button>
          <button
            type="button"
            onClick={() => {
              void loadStatus(false);
              void loadMessages();
            }}
            disabled={isRefreshing || isMessagesLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-beige/90 bg-white px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-cream hover:border-beige active:bg-beige/40 transition disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-warm-gray ${isRefreshing || isMessagesLoading ? 'animate-spin text-sage-dark' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-beige/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition ${
              activeTab === 'history'
                ? 'bg-charcoal text-white shadow-xs'
                : 'text-charcoal hover:bg-cream/80'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Message History & Logs</span>
            {messages.length > 0 && (
              <span className={`ml-1 rounded-full px-2 py-0.2 text-[10px] ${activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-beige/60 text-charcoal'}`}>
                {messages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition ${
              activeTab === 'rules'
                ? 'bg-charcoal text-white shadow-xs'
                : 'text-charcoal hover:bg-cream/80'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Automation Rules</span>
            <span className={`ml-1 rounded-full px-2 py-0.2 text-[10px] ${activeTab === 'rules' ? 'bg-white/20 text-white' : 'bg-beige/60 text-charcoal'}`}>
              5
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('crm_library')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition ${
              activeTab === 'crm_library'
                ? 'bg-charcoal text-white shadow-xs'
                : 'text-charcoal hover:bg-cream/80'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Nurture Library (CRM)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('connection')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition ${
              activeTab === 'connection'
                ? 'bg-charcoal text-white shadow-xs'
                : 'text-charcoal hover:bg-cream/80'
            }`}
          >
            <Radio className="h-4 w-4" />
            <span>Live Device Connection</span>
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
          </button>
        </div>

        {/* TAB 1: MESSAGE HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* History Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Send}
                label="Messages Logged"
                value={messages.length}
                detail="Total events captured in database."
                tone="sage"
              />
              <StatCard
                icon={CheckCircle2}
                label="Delivered"
                value={totalSentCount}
                detail="Successfully sent to WhatsApp."
                tone="sky"
              />
              <StatCard
                icon={Clock}
                label="Pending"
                value={totalPendingCount}
                detail="In flight or queued."
                tone="amber"
              />
              <StatCard
                icon={AlertCircle}
                label="Failed"
                value={totalFailedCount}
                detail="Logged with visible error code."
                tone="rose"
              />
            </div>

            {/* Scheduler Actions and Feedback */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-beige/80 bg-cream/30 p-4">
              <div className="flex items-center gap-2 text-xs text-charcoal">
                <Sparkles className="h-4 w-4 text-sage" />
                <span>
                  Automated reminders run periodically every <strong>10 minutes</strong>. You can also trigger an immediate evaluation.
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleRunScheduler()}
                disabled={isRunningScheduler}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sage/60 bg-white px-3 py-1.5 text-xs font-medium text-sage-dark hover:bg-sage/10 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isRunningScheduler ? 'animate-spin' : ''}`} />
                <span>{isRunningScheduler ? 'Evaluating...' : 'Run Reminder Check Now'}</span>
              </button>
            </div>

            {schedulerFeedback && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 flex items-center justify-between">
                <span>{schedulerFeedback}</span>
                <button type="button" onClick={() => setSchedulerFeedback(null)} className="text-emerald-600 hover:text-emerald-900">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Filters and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by recipient phone, name, or text..."
                  className="w-full rounded-xl border border-beige bg-white pl-9 pr-9 py-2 text-xs text-charcoal outline-none focus:border-sage placeholder:text-warm-gray/60"
                />
                {isMessagesLoading && hasLoadedOnce ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sage animate-spin" />
                ) : searchInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setDebouncedSearchQuery('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray hover:text-charcoal"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal outline-none focus:border-sage"
                >
                  <option value="all">All Statuses</option>
                  <option value="sent">Sent</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>

                {/* Type filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal outline-none focus:border-sage"
                >
                  <option value="all">All Event Types</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="booking_confirmation">Booking Confirmation</option>
                  <option value="reminder_24h">24h Reminder</option>
                  <option value="reminder_1h">1h Reminder</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="manual">Manual Message</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {messagesError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-rose-800 flex items-center justify-between">
                <span>Failed to load message history: {messagesError}</span>
                <button
                  type="button"
                  onClick={() => void loadMessages()}
                  className="rounded-lg bg-rose-100 px-3 py-1 font-medium hover:bg-rose-200"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Messages Table */}
            <div className="rounded-2xl border border-beige/80 bg-white shadow-xs overflow-hidden relative">
              {/* Subtle top indicator bar while debounced filter is loading */}
              {isMessagesLoading && hasLoadedOnce && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-sage/20 overflow-hidden z-10">
                  <div className="h-full bg-sage w-1/3 animate-pulse" />
                </div>
              )}

              {!hasLoadedOnce && isMessagesLoading ? (
                <div className="p-12 text-center space-y-3">
                  <Loader2 className="mx-auto h-6 w-6 text-sage animate-spin" />
                  <p className="text-xs text-warm-gray">Loading message history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <MessageSquare className="mx-auto h-8 w-8 text-warm-gray/40" />
                  <p className="font-serif text-base text-charcoal">No WhatsApp messages found</p>
                  <p className="text-xs text-warm-gray max-w-sm mx-auto">
                    {debouncedSearchQuery
                      ? `No message history found matching "${debouncedSearchQuery}". (Note: Message history displays past and scheduled dispatches, not uncontacted client profiles.)`
                      : statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'No messages match your current filter settings.'
                      : 'As appointments are confirmed and clients register, outgoing messages will be recorded here.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {(debouncedSearchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');
                          setDebouncedSearchQuery('');
                          setStatusFilter('all');
                          setTypeFilter('all');
                        }}
                        className="rounded-xl border border-beige bg-white px-3.5 py-1.5 text-xs text-charcoal hover:bg-cream"
                      >
                        Clear Filters
                      </button>
                    )}
                    {debouncedSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          const digits = debouncedSearchQuery.replace(/[^\d+]/g, '');
                          setManualPhone(digits ? (digits.startsWith('+') ? digits : `+20${digits}`) : '+20');
                          setRecipientMode('direct');
                          handleOpenManualModal();
                        }}
                        className="rounded-xl bg-sage px-3.5 py-1.5 text-xs font-medium text-white hover:bg-sage-dark"
                      >
                        Compose Message
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`overflow-x-auto transition-opacity duration-150 ${isMessagesLoading ? 'opacity-60' : 'opacity-100'}`}>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-cream/40 border-b border-beige/60 text-warm-gray uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Recipient</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Content Preview</th>
                        <th className="px-4 py-3 font-semibold">Related Booking</th>
                        <th className="px-4 py-3 font-semibold">Date & Time</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-beige/40 text-charcoal">
                      {messages.map((m) => (
                        <tr key={m.id} className="hover:bg-cream/20 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-charcoal flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-warm-gray" />
                              <span className="font-mono">{m.recipient_phone}</span>
                            </div>
                            {m.recipient_name && (
                              <div className="text-[11px] text-warm-gray flex items-center gap-1 mt-0.5">
                                <User className="h-2.5 w-2.5" />
                                <span>{m.recipient_name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getTypeBadge(m.message_type)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getStatusBadge(m.status)}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="truncate text-charcoal/80 font-mono text-[11px]">
                              {m.message_content}
                            </p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {m.booking ? (
                              <Link
                                to="/admin/bookings"
                                className="inline-flex items-center gap-1 text-[11px] text-sage-dark hover:underline font-medium"
                              >
                                <Calendar className="h-3 w-3" />
                                <span>{m.booking.appointment_type_title} ({m.booking.appointment_date})</span>
                              </Link>
                            ) : m.related_booking_id ? (
                              <span className="text-[10px] text-warm-gray font-mono">
                                ID: {m.related_booking_id.slice(0, 8)}...
                              </span>
                            ) : (
                              <span className="text-warm-gray/50 text-[11px]">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-warm-gray text-[11px]">
                            {new Date(m.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedMessage(m)}
                              className="inline-flex items-center gap-1 rounded-lg border border-beige px-2.5 py-1 text-[11px] text-charcoal hover:bg-cream transition"
                            >
                              <Eye className="h-3 w-3 text-warm-gray" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AUTOMATION RULES & TEMPLATES */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            {/* Action Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-beige/90 bg-white p-5 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base text-charcoal font-medium">Automated Trigger Rules & Templates</h3>
                  <span className="rounded-full bg-sage/15 text-sage-dark px-2.5 py-0.5 text-[10px] font-semibold">
                    Live Database Config
                  </span>
                </div>
                <p className="text-xs text-warm-gray leading-relaxed max-w-2xl">
                  Enable or disable specific automated WhatsApp triggers and customize message template copy without code changes or redeploying.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenManualModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3.5 py-2 text-xs font-medium text-white hover:bg-sage-dark transition shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send One-Off Custom Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => void loadRules()}
                  disabled={isRulesLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal hover:bg-cream transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 text-warm-gray ${isRulesLoading ? 'animate-spin text-sage' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {rulesError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-rose-800 flex items-center justify-between">
                <span>Failed to load automation rules: {rulesError}</span>
                <button
                  type="button"
                  onClick={() => void loadRules()}
                  className="rounded-lg bg-rose-100 px-3 py-1 font-medium hover:bg-rose-200"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Rules Cards List */}
            {isRulesLoading ? (
              <div className="p-12 text-center space-y-3 rounded-2xl border border-beige/80 bg-white shadow-xs">
                <Loader2 className="mx-auto h-6 w-6 text-sage animate-spin" />
                <p className="text-xs text-warm-gray">Loading automation rules & templates...</p>
              </div>
            ) : rules.length === 0 ? (
              <div className="p-12 text-center space-y-3 rounded-2xl border border-beige/80 bg-white shadow-xs">
                <Sparkles className="mx-auto h-8 w-8 text-warm-gray/40" />
                <p className="font-serif text-base text-charcoal">No automation rules found</p>
                <p className="text-xs text-warm-gray max-w-sm mx-auto">
                  Automation rules table could not be loaded from database.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {rules.map((rule) => {
                  const draft = ruleDrafts[rule.id] || { template_content: rule.template_content, is_enabled: rule.is_enabled };
                  const isDirty = draft.template_content !== rule.template_content;
                  const isSaving = savingRuleId === rule.id;
                  const isSaved = ruleSaveSuccessId === rule.id;

                  return (
                    <div
                      key={rule.id}
                      className={`rounded-2xl border bg-white p-5 shadow-xs transition space-y-4 ${
                        rule.is_enabled ? 'border-beige/90' : 'border-warm-gray/30 opacity-80 bg-cream/20'
                      }`}
                    >
                      {/* Rule Header */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-beige/60 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif text-base font-medium text-charcoal">{rule.title}</h4>
                            <span className="rounded-md bg-cream border border-beige px-2 py-0.5 text-[11px] font-mono text-charcoal">
                              {rule.trigger_type}
                            </span>
                          </div>
                          <p className="text-xs text-warm-gray">{rule.description}</p>
                        </div>

                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-xs font-medium ${
                              rule.is_enabled ? 'text-emerald-700' : 'text-warm-gray'
                            }`}
                          >
                            {rule.is_enabled ? 'Active Trigger' : 'Disabled'}
                          </span>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={rule.is_enabled}
                            onClick={() => void handleToggleRule(rule)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2 ${
                              rule.is_enabled ? 'bg-emerald-600' : 'bg-warm-gray/30'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                rule.is_enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Template Body */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-medium text-charcoal">Message Template Text</label>
                          <span className="text-[11px] text-warm-gray">
                            {draft.template_content.length} characters
                          </span>
                        </div>

                        <textarea
                          rows={6}
                          value={draft.template_content}
                          onChange={(e) => {
                            const newText = e.target.value;
                            setRuleDrafts((prev) => ({
                              ...prev,
                              [rule.id]: {
                                ...(prev[rule.id] || { is_enabled: rule.is_enabled }),
                                template_content: newText,
                              },
                            }));
                          }}
                          className="w-full rounded-xl border border-beige p-3 text-xs text-charcoal outline-none focus:border-sage leading-relaxed font-sans bg-cream/10 resize-y"
                          placeholder="Enter message template text..."
                        />

                        {/* Dynamic Variables Chips */}
                        {rule.available_variables && rule.available_variables.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1.5 pt-1">
                            <span className="text-[11px] text-warm-gray mr-1">Insert variable:</span>
                            {rule.available_variables.map((variable) => (
                              <button
                                key={variable}
                                type="button"
                                onClick={() => {
                                  setRuleDrafts((prev) => ({
                                    ...prev,
                                    [rule.id]: {
                                      ...(prev[rule.id] || { is_enabled: rule.is_enabled }),
                                      template_content: `${draft.template_content} ${variable}`,
                                    },
                                  }));
                                }}
                                className="rounded-lg bg-cream border border-beige px-2 py-0.5 text-[11px] font-mono text-charcoal hover:bg-beige/60 transition cursor-pointer"
                                title={`Click to append ${variable}`}
                              >
                                {variable}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-beige/40">
                        <span className="text-[11px] text-warm-gray">
                          Last updated: {new Date(rule.updated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="flex items-center gap-2">
                          {isDirty && (
                            <button
                              type="button"
                              onClick={() => {
                                setRuleDrafts((prev) => ({
                                  ...prev,
                                  [rule.id]: {
                                    template_content: rule.template_content,
                                    is_enabled: rule.is_enabled,
                                  },
                                }));
                              }}
                              className="rounded-xl border border-beige px-3 py-1.5 text-xs text-warm-gray hover:text-charcoal hover:bg-cream transition"
                            >
                              Reset Changes
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void handleSaveRule(rule.id)}
                            disabled={isSaving || !isDirty}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-4 py-1.5 text-xs font-medium text-white hover:bg-sage-dark transition disabled:opacity-50 shadow-xs"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : isSaved ? (
                              <>
                                <Check className="h-3 w-3 text-white" />
                                <span>Saved!</span>
                              </>
                            ) : (
                              <span>Save Template</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLIENT NURTURE & CONTENT LIBRARY (CRM) */}
        {activeTab === 'crm_library' && <ContentLibraryStudio />}

        {/* TAB 4: LIVE CONNECTION & DEVICE PAIRING */}
        {activeTab === 'connection' && (
          <div className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div className="rounded-2xl border border-beige/80 bg-white p-12 text-center shadow-xs">
                <Loader2 className="mx-auto h-8 w-8 text-sage animate-spin" />
                <h3 className="mt-4 font-serif text-lg text-charcoal font-normal">Checking WhatsApp connection...</h3>
                <p className="mt-1 text-xs text-warm-gray">This usually takes just a moment.</p>
              </div>
            )}

            {/* Service Unavailable */}
            {!isLoading && isServiceUnavailable && (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
                      <ServerOff className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-normal text-charcoal">WhatsApp Service Unreachable</h3>
                        <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
                          {errorCode || 'OFFLINE'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-charcoal/80 max-w-2xl leading-relaxed">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadStatus(false)}
                    className="inline-flex items-center gap-2 rounded-xl bg-charcoal text-white px-4 py-2.5 text-xs font-medium hover:bg-black transition shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Connection</span>
                  </button>
                </div>
              </div>
            )}

            {/* Connected & Active */}
            {!isLoading && isConnected && statusData && (
              <>
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 shrink-0">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="font-serif text-xl font-normal text-charcoal">Connected & Active</h2>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            READY
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal/80">
                          <span className="font-mono font-medium text-emerald-900 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            {statusData.client.phone || 'Phone verified'}
                          </span>
                          {statusData.client.clientName && (
                            <span>Linked as: <strong>{statusData.client.clientName}</strong></span>
                          )}
                          {lastRefreshedAt && (
                            <span className="text-warm-gray text-[11px]">
                              Checked {lastRefreshedAt.toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setIsDisconnectModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 transition"
                      >
                        <PowerOff className="h-3.5 w-3.5" />
                        <span>Disconnect Device</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    icon={Radio}
                    label="Uptime"
                    value={formatUptime(statusData.uptime)}
                    detail="Service running on Oracle Cloud VM."
                    tone="sage"
                  />
                  <StatCard
                    icon={Send}
                    label="Live Queue Processed"
                    value={statusData.queue.totalProcessed}
                    detail={`${statusData.queue.totalFailed} delivery errors.`}
                    tone="sky"
                  />
                  <StatCard
                    icon={Clock}
                    label="Active Queue"
                    value={statusData.queue.queueLength}
                    detail="Current messages in anti-flood queue."
                    tone="amber"
                  />
                </div>
              </>
            )}

            {/* Waiting for QR Pairing */}
            {!isLoading && isWaitingForQr && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-6 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="rounded-2xl bg-amber-100 p-3 text-amber-800 shrink-0">
                      <QrCode className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="font-serif text-xl font-normal text-charcoal">Ready for Device Pairing</h2>
                      <p className="mt-1 text-xs text-charcoal/80">
                        Scan the pairing code with the dedicated WhatsApp phone to link automated messaging.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-12">
                  <div className="md:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-beige/80 bg-white p-6 shadow-xs text-center">
                    {qrData?.qr ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-stone-200/90 bg-stone-50 p-4 inline-block shadow-inner">
                          <img src={qrData.qr} alt="WhatsApp Pairing QR Code" className="w-64 h-64 mx-auto rounded-xl object-contain block" />
                        </div>
                        <p className="text-xs font-medium text-charcoal">WhatsApp pairing code</p>
                      </div>
                    ) : (
                      <div className="py-16 space-y-3">
                        {qrError ? <AlertTriangle className="mx-auto h-8 w-8 text-amber-700" /> : <Loader2 className="mx-auto h-8 w-8 text-sage animate-spin" />}
                        <p className="text-xs text-warm-gray">{qrError || 'Loading pairing code...'}</p>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-7 rounded-2xl border border-beige/80 bg-white p-6 shadow-xs">
                    <h3 className="font-serif text-lg text-charcoal">Instructions</h3>
                    <ol className="mt-4 space-y-3 text-xs text-charcoal list-decimal list-inside">
                      <li>Open WhatsApp on the coach phone.</li>
                      <li>Go to <strong>Linked Devices</strong> in Settings or the top right menu.</li>
                      <li>Tap <strong>Link a Device</strong> and scan the code.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: MESSAGE DETAILS */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-beige space-y-4">
            <div className="flex items-center justify-between border-b border-beige/60 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg text-charcoal font-medium">Message Details</h3>
                {getTypeBadge(selectedMessage.message_type)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="text-warm-gray hover:text-charcoal p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-charcoal">
              <div className="grid grid-cols-2 gap-2 bg-cream/40 p-3 rounded-xl">
                <div>
                  <span className="text-warm-gray block text-[10px] uppercase">Recipient</span>
                  <span className="font-mono font-medium">{selectedMessage.recipient_phone}</span>
                  {selectedMessage.recipient_name && <span className="block text-warm-gray">({selectedMessage.recipient_name})</span>}
                </div>
                <div>
                  <span className="text-warm-gray block text-[10px] uppercase">Status</span>
                  {getStatusBadge(selectedMessage.status)}
                </div>
              </div>

              <div>
                <span className="text-warm-gray block text-[10px] uppercase mb-1">Message Content</span>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {selectedMessage.message_content}
                </div>
              </div>

              {selectedMessage.error_message && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800">
                  <span className="block font-semibold text-[10px] uppercase">Error Details:</span>
                  <p className="mt-0.5 font-mono">{selectedMessage.error_message}</p>
                </div>
              )}

              <div className="text-[11px] text-warm-gray space-y-0.5 border-t border-beige/40 pt-2">
                <div>Logged at: {new Date(selectedMessage.created_at).toLocaleString()}</div>
                {selectedMessage.sent_at && <div>Sent at: {new Date(selectedMessage.sent_at).toLocaleString()}</div>}
                {selectedMessage.whatsapp_message_id && <div>WhatsApp ID: <span className="font-mono">{selectedMessage.whatsapp_message_id}</span></div>}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="rounded-xl bg-charcoal text-white px-4 py-2 text-xs font-medium hover:bg-black transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL SEND */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleSendManual} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-beige space-y-4">
            <div className="flex items-center justify-between border-b border-beige/60 pb-3">
              <h3 className="font-serif text-lg text-charcoal font-medium">Send WhatsApp Message</h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-warm-gray hover:text-charcoal p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Recipient Selection Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-charcoal font-medium">Recipient</label>
                  <div className="inline-flex rounded-lg border border-beige bg-cream/30 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRecipientMode('search')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                        recipientMode === 'search'
                          ? 'bg-charcoal text-white shadow-xs'
                          : 'text-warm-gray hover:text-charcoal'
                      }`}
                    >
                      <User className="h-3 w-3" />
                      <span>Search Users</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientMode('direct');
                        setSelectedUser(null);
                        if (!manualPhone) setManualPhone('+20');
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                        recipientMode === 'direct'
                          ? 'bg-charcoal text-white shadow-xs'
                          : 'text-warm-gray hover:text-charcoal'
                      }`}
                    >
                      <Phone className="h-3 w-3" />
                      <span>Enter Number</span>
                    </button>
                  </div>
                </div>

                {recipientMode === 'search' ? (
                  <div className="space-y-2">
                    {selectedUser ? (
                      <div className="flex items-center justify-between rounded-xl border border-sage/40 bg-sage/5 p-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage/20 text-sage-dark font-semibold text-xs shrink-0">
                            {(selectedUser.full_name || selectedUser.email || 'U')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-charcoal text-xs truncate">
                              {selectedUser.full_name || 'Unnamed Client'}
                            </div>
                            <div className="text-[11px] text-warm-gray truncate">
                              {selectedUser.email}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleClearSelectedUser}
                          className="rounded-lg p-1 text-warm-gray hover:bg-cream hover:text-charcoal transition"
                          title="Change user"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-warm-gray" />
                          <input
                            type="text"
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            placeholder="Search users by name, email, or phone..."
                            className="w-full rounded-xl border border-beige bg-white pl-8 pr-8 py-2 text-xs text-charcoal outline-none focus:border-sage placeholder:text-warm-gray/60"
                          />
                          {isSearchingUsers ? (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sage animate-spin" />
                          ) : userSearchTerm ? (
                            <button
                              type="button"
                              onClick={() => setUserSearchTerm('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray hover:text-charcoal"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>

                        {/* Dropdown list of matching users */}
                        <div className="max-h-36 overflow-y-auto rounded-xl border border-beige bg-white shadow-xs divide-y divide-beige/40">
                          {userSearchResults.length === 0 ? (
                            <div className="p-3 text-center text-[11px] text-warm-gray">
                              {isSearchingUsers ? 'Searching...' : 'No users found.'}
                            </div>
                          ) : (
                            userSearchResults.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleSelectUser(u)}
                                className="w-full text-left p-2 hover:bg-cream/40 transition flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-charcoal truncate">
                                    {u.full_name || 'Unnamed Client'}
                                  </div>
                                  <div className="text-[10px] text-warm-gray truncate">{u.email}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  {u.phone ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono text-emerald-800">
                                      <Phone className="h-2.5 w-2.5" />
                                      {u.phone}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-warm-gray/60 italic">No phone</span>
                                  )}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Verified/target phone input with country code selector */}
                    <div>
                      <label className="block text-[11px] text-warm-gray mb-1">
                        Recipient Mobile Number {selectedUser && !selectedUser.phone ? '(Required for this user)' : ''}
                      </label>
                      <PhoneInput
                        value={manualPhone}
                        onChange={(val) => setManualPhone(val)}
                        inputClassName="!py-2 !rounded-xl !text-xs font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] text-warm-gray mb-1">
                      Recipient Mobile Number
                    </label>
                    <PhoneInput
                      value={manualPhone}
                      onChange={(val) => setManualPhone(val)}
                      inputClassName="!py-2 !rounded-xl !text-xs font-mono"
                    />
                    <p className="text-[11px] text-warm-gray mt-1">
                      Choose country code from the dropdown and enter the local mobile number.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-charcoal font-medium mb-1">Message Body</label>
                <textarea
                  required
                  rows={4}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full rounded-xl border border-beige px-3 py-2 text-xs text-charcoal outline-none focus:border-sage leading-relaxed"
                />
              </div>

              {manualSendResult && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    manualSendResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {manualSendResult.message}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                disabled={isSendingManual}
                className="rounded-xl border border-beige px-4 py-2 text-xs font-medium text-charcoal hover:bg-cream transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingManual || parsePhone(manualPhone).local.trim().length < 6 || !manualText.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-4 py-2 text-xs font-medium text-white hover:bg-sage-dark transition disabled:opacity-50"
              >
                {isSendingManual ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>{isSendingManual ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DISCONNECT CONFIRMATION */}
      {isDisconnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div ref={dialogRef} tabIndex={-1} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-beige space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-700 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-charcoal font-medium">Disconnect WhatsApp Account?</h3>
                <p className="mt-1 text-xs text-warm-gray leading-relaxed">
                  This will safely log out the current phone number, reset the session, and regenerate a new QR code for pairing. Automated reminders will be paused until re-linked.
                </p>
              </div>
            </div>

            {disconnectError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {disconnectError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(false)}
                disabled={isDisconnecting}
                className="rounded-xl border border-beige px-4 py-2 text-xs font-medium text-charcoal hover:bg-cream transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDisconnect()}
                disabled={isDisconnecting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700 transition disabled:opacity-50"
              >
                {isDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
                <span>{isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
