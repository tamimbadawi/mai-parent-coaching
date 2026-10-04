import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Edit3,
  Loader2,
  PlusCircle,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import PhoneInput, { formatPhone, getDialCodeForCountry, parsePhone } from '../../../components/ui/PhoneInput';
import { COUNTRIES } from '../../../data/countries';

export interface UserComposerData {
  id?: string;
  email: string;
  fullName: string;
  dialCode: string;
  localPhone: string;
  country: string;
  city: string;
  address: string;
  password: string;
  role: 'student' | 'admin' | 'assistant';
}

const emptyDraft: UserComposerData = {
  email: '',
  fullName: '',
  dialCode: '+20',
  localPhone: '',
  country: '',
  city: '',
  address: '',
  password: '',
  role: 'student',
};

interface UserComposerModalProps {
  isOpen: boolean;
  editingUser: {
    id: string;
    email: string;
    full_name?: string | null;
    phone?: string | null;
    country?: string | null;
    city?: string | null;
    address?: string | null;
    role?: 'student' | 'admin' | 'assistant' | string;
  } | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const UserComposerModal = ({
  isOpen,
  editingUser,
  onClose,
  onSaved,
}: UserComposerModalProps): JSX.Element | null => {
  const [draft, setDraft] = useState<UserComposerData>(emptyDraft);
  const [activeTab, setActiveTab] = useState<'profile' | 'access'>('profile');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDraft(emptyDraft);
      setError(null);
      setActiveTab('profile');
      return;
    }

    if (editingUser) {
      const { dialCode: parsedDial, local } = parsePhone(editingUser.phone ?? null);
      const countryDial = getDialCodeForCountry(editingUser.country);
      const dialCode = editingUser.phone ? parsedDial : (countryDial ?? parsedDial);

      setDraft({
        id: editingUser.id,
        email: editingUser.email ?? '',
        fullName: editingUser.full_name ?? '',
        dialCode,
        localPhone: local,
        country: editingUser.country ?? '',
        city: editingUser.city ?? '',
        address: editingUser.address ?? '',
        password: '',
        role:
          editingUser.role === 'admin'
            ? 'admin'
            : editingUser.role === 'assistant'
            ? 'assistant'
            : 'student',
      });
    } else {
      setDraft(emptyDraft);
    }
  }, [isOpen, editingUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCountrySelect = (iso: string): void => {
    const prefix = getDialCodeForCountry(iso);
    setDraft((prev) => ({
      ...prev,
      country: iso,
      dialCode: prefix ?? prev.dialCode,
    }));
  };

  const invokeUserManager = async (payload: Record<string, unknown>): Promise<{ error?: string }> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        return { error: 'No active session. Please log out and back in.' };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const functionUrl = `${supabaseUrl}/functions/v1/admin-user-manager`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(responseText);
          errMsg = parsed.error ?? parsed.message ?? errMsg;
        } catch {
          // not JSON
        }
        return { error: errMsg };
      }

      try {
        const data = JSON.parse(responseText);
        if (data.error) return { error: data.error };
        return data;
      } catch {
        return { error: `Could not parse response: ${responseText}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Network error: ${msg}` };
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!draft.fullName.trim()) {
      setActiveTab('profile');
      setError('Full name is required.');
      return;
    }

    if (!draft.email.trim()) {
      setActiveTab('profile');
      setError('Email address is required.');
      return;
    }

    if (!draft.country?.trim()) {
      setActiveTab('profile');
      setError('Country of residency is required.');
      return;
    }

    const cleanPhoneDigits = draft.localPhone.replace(/\D/g, '');
    if (!draft.localPhone.trim() || cleanPhoneDigits.length < 7) {
      setActiveTab('profile');
      setError('A working phone number is required (minimum 7 digits).');
      return;
    }

    if (!editingUser && !draft.password.trim()) {
      setActiveTab('access');
      setError('A password is required when creating a new user.');
      return;
    }

    const phone = formatPhone(draft.dialCode, draft.localPhone);

    const payload = editingUser
      ? {
          action: 'updateUser',
          userId: editingUser.id,
          email: draft.email.trim(),
          password: draft.password.trim() || undefined,
          fullName: draft.fullName.trim(),
          phone,
          country: draft.country.trim() || null,
          city: draft.city.trim() || null,
          address: draft.address.trim() || null,
          role: draft.role,
          approvalStatus: 'approved',
        }
      : {
          action: 'createUser',
          email: draft.email.trim(),
          password: draft.password.trim(),
          fullName: draft.fullName.trim(),
          phone,
          country: draft.country.trim() || null,
          city: draft.city.trim() || null,
          address: draft.address.trim() || null,
          role: draft.role,
          approvalStatus: 'approved',
        };

    setSaving(true);
    try {
      const result = await invokeUserManager(payload);
      if (result.error) {
        setError(result.error);
        return;
      }

      onSaved(editingUser ? 'User profile updated successfully.' : 'User account created successfully.');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Unexpected error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-3 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col justify-between w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-3xl border border-beige bg-white p-4 sm:p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-beige/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/20 text-sage-dark">
              {editingUser ? <Edit3 className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <h2 id="user-modal-title" className="font-serif text-base sm:text-lg font-semibold text-charcoal truncate">
                {editingUser ? 'Edit User Details' : 'Add New Client / User'}
              </h2>
              <p className="text-[11px] text-warm-gray truncate">
                {editingUser ? `Account: ${editingUser.email}` : 'Create a managed account with assigned role'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-warm-gray transition hover:bg-beige/40 hover:text-charcoal cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 my-2.5 p-1 rounded-xl bg-[#faf8f4] border border-beige/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-charcoal shadow-2xs font-semibold'
                : 'text-warm-gray hover:text-charcoal font-medium'
            }`}
          >
            <UserRound className="h-3.5 w-3.5 text-sage-dark" />
            <span>Profile & Contact</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('access')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs transition cursor-pointer ${
              activeTab === 'access'
                ? 'bg-white text-charcoal shadow-2xs font-semibold'
                : 'text-warm-gray hover:text-charcoal font-medium'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-sage-dark" />
            <span>Role & Security</span>
          </button>
        </div>

        {/* Error notice if present */}
        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800 shrink-0 mb-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="truncate">{error}</span>
          </div>
        ) : null}

        {/* Form content */}
        <form onSubmit={handleSubmit} className="flex flex-col justify-between flex-1 min-h-0">
          <div className="space-y-2.5">
            {activeTab === 'profile' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-warm-gray">
                      Full Name *
                    </label>
                    <input
                      required
                      value={draft.fullName}
                      onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3 py-2 text-xs sm:text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-warm-gray">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={draft.email}
                      onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="parent@example.com"
                      className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3 py-2 text-xs sm:text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-warm-gray">
                      Country of Residency *
                    </label>
                    <select
                      value={draft.country}
                      onChange={(e) => handleCountrySelect(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3 py-2 text-xs sm:text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white cursor-pointer"
                    >
                      <option value="">Select country...</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.iso} value={c.iso}>
                          {c.flag} {c.name} ({c.iso})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <PhoneInput
                      label="Working Phone Number *"
                      inputClassName="!py-2 !text-xs sm:!text-sm !rounded-xl"
                      value={`${draft.dialCode}${draft.localPhone}`}
                      onChange={(val) => {
                        const { dialCode, local } = parsePhone(val || null);
                        setDraft((prev) => ({ ...prev, dialCode, localPhone: local }));
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-warm-gray">
                      City
                    </label>
                    <input
                      value={draft.city}
                      onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g. Cairo, Dubai, London"
                      className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3 py-2 text-xs sm:text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-warm-gray">
                      Address / Street
                    </label>
                    <input
                      value={draft.address}
                      onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Street, building, apartment"
                      className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3 py-2 text-xs sm:text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-warm-gray">
                    Account Role
                  </label>
                  <select
                    value={draft.role}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, role: e.target.value as 'student' | 'admin' | 'assistant' }))
                    }
                    className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3 py-2 text-xs sm:text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white cursor-pointer"
                  >
                    <option value="student">Student / Client (Default Member Access)</option>
                    <option value="assistant">Assistant (Practice & Scheduling Lead)</option>
                    <option value="admin">Administrator (Full System Access)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-warm-gray leading-normal">
                    {draft.role === 'admin'
                      ? 'Full administrative control over CRM, clients, sessions, content, and settings.'
                      : draft.role === 'assistant'
                      ? 'Scheduling coordinator with access to client follow-up hub, notes, and direct outreach.'
                      : 'Standard client profile with access to their dashboard, courses, and booked sessions.'}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-warm-gray">
                    {editingUser ? 'New Password (Optional)' : 'Account Password *'}
                  </label>
                  <input
                    type="password"
                    value={draft.password}
                    onChange={(e) => setDraft((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder={editingUser ? 'Leave blank to keep existing password' : 'Minimum 6 characters'}
                    className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3 py-2 text-xs sm:text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
                  />
                  <p className="mt-1 text-[11px] text-warm-gray leading-normal">
                    {editingUser
                      ? 'Only fill this in if you need to reset or update this user’s password.'
                      : 'Required to create a new authentication login for this account.'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer buttons pinned to bottom */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-beige/60 mt-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-beige bg-white px-3.5 py-2 text-xs font-medium text-charcoal transition hover:bg-[#faf8f4] cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab === 'profile' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('access')}
                  className="rounded-xl border border-beige bg-[#faf8f4] px-3 py-2 text-xs font-medium text-charcoal transition hover:border-sage cursor-pointer"
                >
                  Role & Security →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="rounded-xl border border-beige bg-[#faf8f4] px-3 py-2 text-xs font-medium text-charcoal transition hover:border-sage cursor-pointer"
                >
                  ← Contact Info
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-sage px-4 sm:px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sage-dark disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </span>
                ) : editingUser ? (
                  'Save Changes'
                ) : (
                  'Create User'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
