import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Lock, ArrowRight, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUPER_ADMIN_PASSCODE = '654321';
const STORAGE_KEY = 'mai_super_admin_verified';

interface SuperAdminGateProps {
  children: (props: { isSuperAdmin: boolean; lockSuperAdmin: () => void }) => React.ReactNode;
}

export const SuperAdminGate: React.FC<SuperAdminGateProps> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    setTimeout(() => {
      if (passcode.trim() === SUPER_ADMIN_PASSCODE) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        setIsAuthorized(true);
        setError(null);
      } else {
        setError('Incorrect authorization passcode. Access denied.');
      }
      setSubmitting(false);
    }, 300);
  };

  const lockSuperAdmin = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAuthorized(false);
    setPasscode('');
    setError(null);
  };

  if (isAuthorized) {
    return <>{children({ isSuperAdmin: true, lockSuperAdmin })}</>;
  }

  return (
    <div className="min-h-[600px] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xs rounded-3xl p-8 border border-beige shadow-sm text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-sage/30 rounded-full blur-2xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-100/80 border border-amber-300 text-amber-800 mx-auto flex items-center justify-center mb-5 shadow-xs">
          <Shield className="w-8 h-8" />
        </div>

        {/* Title & Description */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 mb-3">
          <Lock className="w-3.5 h-3.5" />
          Super Admin Clearance
        </span>

        <h2 className="font-serif text-2xl text-charcoal tracking-tight mb-2">
          Restricted Clinical Area
        </h2>

        <p className="text-xs sm:text-sm text-charcoal/70 leading-relaxed mb-6">
          Client therapy session notes, psychological observations, and full transcripts are strictly restricted. Enter your Super Admin passcode to elevate privileges.
        </p>

        {/* Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-charcoal/40 absolute left-3.5 top-3.5" />
            <input
              type={showPasscode ? 'text' : 'password'}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(null);
              }}
              placeholder="Enter passcode"
              autoFocus
              className="w-full pl-10 pr-10 py-3 rounded-xl text-center text-sm font-mono tracking-widest bg-ivory border border-beige/90 focus:outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all text-charcoal"
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute right-3.5 top-3.5 text-charcoal/40 hover:text-charcoal transition-colors p-0.5"
            >
              {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!passcode.trim() || submitting}
            className="w-full py-3 px-4 rounded-xl bg-charcoal text-white text-sm font-medium hover:bg-charcoal/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <span>Authorize & Unlock</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-beige/60">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-charcoal/60 hover:text-charcoal transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Admin Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
