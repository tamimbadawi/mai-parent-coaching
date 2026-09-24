import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Loader2, AlertCircle, KeyRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../pages/admin/AdminLayout';

interface FamilyUnlockGateProps {
  children: React.ReactNode;
  /** Whether to wrap the locked screen with the AdminLayout shell */
  withLayout?: boolean;
  /** Optional callback fired when unlock is successfully completed */
  onUnlocked?: () => void;
  /** Optional close callback rendered only while locked (e.g. inside a modal) */
  onClose?: () => void;
  /** Optional callback tracking unlocked state */
  onStatusChange?: (unlocked: boolean) => void;
}

export const FamilyUnlockGate: React.FC<FamilyUnlockGateProps> = ({
  children,
  withLayout = false,
  onUnlocked,
  onClose,
  onStatusChange,
}) => {
  const [checking, setChecking] = useState<boolean>(true);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkUnlockStatus = useCallback(async () => {
    setChecking(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.rpc('has_family_unlock');
      if (error) {
        console.error('Failed checking family unlock status:', error);
        setIsUnlocked(false);
      } else {
        setIsUnlocked(Boolean(data));
      }
    } catch (err: unknown) {
      console.error('Error invoking has_family_unlock RPC:', err);
      setIsUnlocked(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkUnlockStatus();
  }, [checkUnlockStatus]);

  // Listen for explicit manual lock events
  useEffect(() => {
    const handleLockEvent = () => {
      setIsUnlocked(false);
      setPassword('');
      setErrorMessage(null);
    };
    window.addEventListener('family-sessions-locked', handleLockEvent);
    return () => window.removeEventListener('family-sessions-locked', handleLockEvent);
  }, []);

  useEffect(() => {
    onStatusChange?.(isUnlocked);
  }, [isUnlocked, onStatusChange]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('family-unlock', {
        body: { password: password.trim() },
      });

      if (error) {
        let message = error.message || 'Unable to unlock family sessions.';
        if (error && typeof error === 'object' && 'context' in error) {
          try {
            const body = await (error as { context?: { json: () => Promise<{ error?: string }> } }).context?.json();
            if (body?.error) {
              message = body.error;
            }
          } catch {
            // Keep error.message
          }
        }
        setErrorMessage(message);
        return;
      }

      if (data?.error) {
        setErrorMessage(data.error);
        return;
      }

      if (data?.success) {
        setIsUnlocked(true);
        setPassword('');
        onUnlocked?.();
      } else {
        setErrorMessage('Unexpected response received from unlock service.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error while attempting unlock.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    const loadingCard = (
      <div className="relative flex flex-col items-center justify-center min-h-[360px] p-8 text-center w-full">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 text-warm-gray hover:text-charcoal rounded-xl hover:bg-beige/40 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="w-12 h-12 rounded-2xl bg-cream border border-beige flex items-center justify-center mb-3">
          <Loader2 className="w-5 h-5 text-sage-dark animate-spin" />
        </div>
        <p className="text-xs font-medium text-charcoal/70">Checking Family Sessions security access...</p>
      </div>
    );

    if (withLayout) {
      return (
        <AdminLayout title="Family Sessions" subtitle="Checking access permissions...">
          {loadingCard}
        </AdminLayout>
      );
    }
    return loadingCard;
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  const unlockForm = (
    <div className="relative flex flex-col items-center justify-center min-h-[460px] p-6 w-full">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-warm-gray hover:text-charcoal rounded-xl hover:bg-beige/40 transition cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="w-full max-w-md bg-white border border-beige/80 rounded-3xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-sage/15 border border-sage/25 flex items-center justify-center text-sage-dark mb-4 shadow-2xs">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-serif text-charcoal font-semibold mb-1.5">
          Family Sessions Protected
        </h2>
        <p className="text-xs text-warm-gray mb-6 leading-relaxed">
          Clinical transcripts, session notes, and member observations are confidential. Enter the shared password to unlock this session workspace.
        </p>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-terracotta/10 border border-terracotta/20 text-terracotta flex items-start gap-2.5 text-left text-xs leading-normal">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4 text-left">
          <div>
            <label
              htmlFor="family-sessions-password-input"
              className="block text-xs font-semibold text-charcoal mb-1.5"
            >
              Family Sessions Password
            </label>
            <div className="relative">
              <input
                id="family-sessions-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter shared admin password"
                disabled={submitting}
                autoComplete="current-password"
                className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-beige focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage bg-cream/30 text-charcoal transition disabled:opacity-50"
              />
              <KeyRound className="w-4 h-4 text-warm-gray absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-sage text-white hover:bg-sage-dark transition shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying password...</span>
              </>
            ) : (
              <span>Unlock Family Sessions</span>
            )}
          </button>
        </form>

        <p className="text-[11px] text-warm-gray/70 mt-6 text-center">
          Access remains active for 8 hours on this admin account.
        </p>
      </div>
    </div>
  );

  if (withLayout) {
    return (
      <AdminLayout
        title="Family Sessions"
        subtitle="Password-protected clinical records"
      >
        {unlockForm}
      </AdminLayout>
    );
  }

  return unlockForm;
};

export default FamilyUnlockGate;
