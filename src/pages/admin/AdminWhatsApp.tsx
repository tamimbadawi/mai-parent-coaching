import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { Panel, StatCard } from './components/AdminUI';
import {
  fetchWhatsAppStatus,
  fetchWhatsAppQr,
  resetWhatsAppSession,
  type WhatsAppStatusResponse,
  type WhatsAppQrResponse,
} from '../../lib/whatsappAdmin';

export default function AdminWhatsApp(): JSX.Element {
  // Main data states
  const [statusData, setStatusData] = useState<WhatsAppStatusResponse | null>(null);
  const [qrData, setQrData] = useState<WhatsAppQrResponse | null>(null);

  // UI interaction states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Disconnect modal states
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // Polling ref to safely clear interval on unmount or tab hide
  const pollTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Format uptime seconds into human-readable string
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
    if (!isSilent) {
      setIsRefreshing(true);
    }

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

        // If client is in QR_READY state, immediately load QR image data
        if (result.data.client.state === 'QR_READY' || result.data.client.hasQr) {
          void loadQr();
        } else {
          setQrData(null);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // QR loader (fetches base64 data URL without logging or persisting)
  const loadQr = useCallback(async () => {
    try {
      const result = await fetchWhatsAppQr();
      if (isMountedRef.current && result.data && result.data.status === 'ok') {
        setQrData(result.data);
      }
    } catch {
      // Handled silently
    }
  }, []);

  // Trigger fail-closed session reset
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
        // Success: close modal and re-fetch status
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

  // Keep connection state current while the admin page is visible.
  useEffect(() => {
    isMountedRef.current = true;
    void loadStatus(false);

    const checkAndPoll = () => {
      // Clear existing timer
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      // Do not poll if document is hidden (user switched tabs)
      if (document.hidden) return;

      pollTimerRef.current = window.setInterval(() => {
        if (!document.hidden && isMountedRef.current) {
          void loadStatus(true);
        }
      }, 5000);
    };

    checkAndPoll();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadStatus(true);
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
  }, [loadStatus]);

  // Determine current lifecycle state
  const clientState = statusData?.client?.state;
  const isConnected = clientState === 'READY' || statusData?.client?.ready === true;
  const isWaitingForQr = clientState === 'QR_READY' || (statusData?.client?.hasQr && !isConnected);
  const isInitializing = clientState === 'INITIALIZING';
  const isDisconnected = clientState === 'DISCONNECTED' || clientState === 'AUTH_FAILURE';
  const isServiceUnavailable = Boolean(errorMessage && !statusData);

  return (
    <AdminLayout
      title="WhatsApp Automation"
      subtitle="Monitor live WhatsApp connection, link coaching devices, and manage session lifecycle."
      action={
        <button
          type="button"
          onClick={() => void loadStatus(false)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-beige/90 bg-white px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-cream hover:border-beige active:bg-beige/40 transition-colors disabled:opacity-50 shadow-xs"
          aria-label="Refresh WhatsApp status"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-warm-gray ${isRefreshing ? 'animate-spin text-sage-dark' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Status'}</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="rounded-2xl border border-beige/80 bg-white p-12 text-center shadow-xs">
            <Loader2 className="mx-auto h-8 w-8 text-sage animate-spin" />
            <h3 className="mt-4 font-serif text-lg text-charcoal font-normal">Checking WhatsApp connection...</h3>
            <p className="mt-1 text-xs text-warm-gray">
              This usually takes just a moment.
            </p>
          </div>
        )}

        {/* State 1: Service Unavailable / Unconfigured */}
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
                  <p className="mt-2 text-[11px] text-warm-gray">
                    Check again in a moment. If this continues, contact the site administrator.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadStatus(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-charcoal text-white px-4 py-2.5 text-xs font-medium hover:bg-black transition-colors shrink-0 shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        )}

        {/* State 2: Connected & Active */}
        {!isLoading && isConnected && statusData && (
          <>
            {/* Primary Connection Banner */}
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-serif text-xl font-normal text-charcoal">
                        Connected & Active
                      </h2>
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
                    onClick={() => void loadStatus(false)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/80 bg-white px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-cream transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-warm-gray ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Health & Operational Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                icon={Radio}
                label="Uptime"
                value={formatUptime(statusData.uptime)}
                detail="Time since the service started."
                tone="sage"
              />
              <StatCard
                icon={Send}
                label="Messages Sent"
                value={statusData.queue.totalProcessed}
                detail={`${statusData.queue.totalFailed} failed messages.`}
                tone="sky"
              />
              <StatCard
                icon={Clock}
                label="Pending Messages"
                value={statusData.queue.queueLength}
                detail="Messages waiting to be sent."
                tone="amber"
              />
            </div>
          </>
        )}

        {/* State 3: Waiting to Connect / QR Ready */}
        {!isLoading && isWaitingForQr && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-800 shrink-0">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-xl font-normal text-charcoal">
                        Ready for Device Pairing
                      </h2>
                      <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                        SCAN CODE
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-charcoal/80">
                      Link the dedicated coach WhatsApp phone to enable automated session confirmations and reminders.
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-warm-gray">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Auto-polling status
                  </span>
                </div>
              </div>
            </div>

            {/* QR Card & Step-by-Step Instructions */}
            <div className="grid gap-6 md:grid-cols-12">
              {/* QR Code Container */}
              <div className="md:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-beige/80 bg-white p-6 shadow-xs text-center">
                {qrData?.qr ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-stone-200/90 bg-stone-50 p-4 inline-block shadow-inner">
                      <img
                        src={qrData.qr}
                        alt="WhatsApp Pairing QR Code"
                        className="w-64 h-64 mx-auto rounded-xl object-contain block"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-charcoal">
                        Dynamic WhatsApp Web Pairing Code
                      </p>
                      <p className="text-[11px] text-warm-gray">
                        Refreshes automatically to maintain cryptographic handshake.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 space-y-3">
                    <Loader2 className="mx-auto h-8 w-8 text-sage animate-spin" />
                    <p className="text-xs text-warm-gray">Fetching dynamic pairing QR from server...</p>
                  </div>
                )}
              </div>

              {/* Instructions Panel */}
              <div className="md:col-span-7 rounded-2xl border border-beige/80 bg-white p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="border-b border-beige/60 pb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray">Setup Guide</p>
                    <h3 className="font-serif text-lg text-charcoal font-normal mt-0.5">How to Link WhatsApp</h3>
                  </div>

                  <ol className="mt-5 space-y-4 text-xs text-charcoal">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage/20 text-xs font-bold text-sage-dark">
                        1
                      </span>
                      <div className="pt-0.5">
                        <p className="font-medium">Open WhatsApp on your mobile phone</p>
                        <p className="text-warm-gray text-[11px] mt-0.5">
                          Use the dedicated coach or business number intended for client communication.
                        </p>
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage/20 text-xs font-bold text-sage-dark">
                        2
                      </span>
                      <div className="pt-0.5">
                        <p className="font-medium">Navigate to Linked Devices</p>
                        <p className="text-warm-gray text-[11px] mt-0.5">
                          On iPhone: <strong>Settings &gt; Linked Devices</strong>. On Android: Tap the <strong>three dots (⋮) &gt; Linked Devices</strong>.
                        </p>
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage/20 text-xs font-bold text-sage-dark">
                        3
                      </span>
                      <div className="pt-0.5">
                        <p className="font-medium">Tap &ldquo;Link a Device&rdquo; and scan the QR code</p>
                        <p className="text-warm-gray text-[11px] mt-0.5">
                          Point your phone camera at the QR code on the left. The dashboard will automatically detect the connection and transition to Active.
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="mt-6 rounded-xl border border-beige/80 bg-[#faf8f4] p-3.5 text-[11px] text-warm-gray flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-sage-dark shrink-0" />
                  <span>
                    Sessions persist safely across VM reboots using encrypted disk tokens (<code className="text-charcoal font-mono">.wwebjs_auth</code>). You will not need to re-scan regularly.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State 4: Initializing */}
        {!isLoading && isInitializing && (
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-8 text-center shadow-xs">
            <Loader2 className="mx-auto h-7 w-7 text-sky-600 animate-spin" />
            <h3 className="mt-4 font-serif text-lg text-charcoal font-normal">Starting WhatsApp Web Engine</h3>
            <p className="mt-1 text-xs text-warm-gray max-w-md mx-auto">
              Headless Chromium is loading and verifying session files. This takes approximately 5–15 seconds. The page will refresh automatically.
            </p>
          </div>
        )}

        {/* State 5: Disconnected / Auth Failure */}
        {!isLoading && isDisconnected && (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="rounded-2xl bg-rose-100 p-3 text-rose-700 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-charcoal font-normal">Session Terminated or Expired</h3>
                  <p className="mt-1 text-xs text-charcoal/80">
                    The WhatsApp session was unlinked from the phone or auth tokens expired. Reset the session to generate a fresh pairing QR code.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(true)}
                className="rounded-xl bg-charcoal text-white px-4 py-2 text-xs font-medium hover:bg-black transition-colors shrink-0 shadow-xs"
              >
                Reset & Link New Device
              </button>
            </div>
          </div>
        )}

        {/* Danger Zone: Session Disconnection / Reset */}
        {!isLoading && (isConnected || isDisconnected) && (
          <Panel
            title="Session Management"
            eyebrow="Danger Zone"
            className="border-rose-200/70"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-charcoal">Disconnect Active Number</p>
                <p className="mt-0.5 text-xs text-warm-gray max-w-xl">
                  Safely terminates the active WhatsApp Web session, destroys the browser instance, and permanently deletes session credentials from the server. Use this if switching to a new coaching phone number.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 active:bg-rose-200 transition-colors shrink-0"
              >
                <PowerOff className="h-3.5 w-3.5" />
                <span>Disconnect WhatsApp</span>
              </button>
            </div>
          </Panel>
        )}
      </div>

      {/* Disconnect Confirmation Modal Dialog */}
      {isDisconnectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disconnect-dialog-title"
          aria-describedby="disconnect-dialog-desc"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isDisconnecting) {
              setIsDisconnectModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-beige bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="rounded-xl bg-rose-100 p-2.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 id="disconnect-dialog-title" className="font-serif text-lg font-normal text-charcoal">
                  Disconnect WhatsApp?
                </h3>
                <p className="text-xs text-warm-gray">Action cannot be undone automatically</p>
              </div>
            </div>

            <p id="disconnect-dialog-desc" className="text-xs text-charcoal/80 leading-relaxed">
              Are you sure you want to disconnect this device? The active <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">LocalAuth</code> session tokens will be purged from the server, outbound notifications will pause, and a new QR code scan will be required before messages can be sent again.
            </p>

            {disconnectError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {disconnectError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-beige/60">
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(false)}
                disabled={isDisconnecting}
                className="rounded-xl border border-beige/80 bg-white px-4 py-2 text-xs font-medium text-warm-gray hover:bg-cream transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleConfirmDisconnect()}
                disabled={isDisconnecting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-xs"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Resetting Session...</span>
                  </>
                ) : (
                  <>
                    <PowerOff className="h-3.5 w-3.5" />
                    <span>Confirm Disconnect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
