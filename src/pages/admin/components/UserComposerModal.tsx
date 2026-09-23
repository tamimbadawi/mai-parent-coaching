import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Edit3,
  Globe,
  Loader2,
  PlusCircle,
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
  role: 'student' | 'admin';
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
    role?: 'student' | 'admin' | string;
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
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDraft(emptyDraft);
      setError(null);
      setCountryOpen(false);
      setCountrySearch('');
      return;
    }

    if (editingUser) {
      const { dialCode: parsedDial, local } = parsePhone(editingUser.phone);
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
        role: editingUser.role === 'admin' ? 'admin' : 'student',
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

  const selectedCountry = useMemo(() => {
    if (!draft.country) return null;
    return COUNTRIES.find((c) => c.iso === draft.country || c.name === draft.country) ?? null;
  }, [draft.country]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase().includes(q));
  }, [countrySearch]);

  const handleCountrySelect = (iso: string): void => {
    const prefix = getDialCodeForCountry(iso);
    setDraft((prev) => ({
      ...prev,
      country: iso,
      dialCode: prefix ?? prev.dialCode,
    }));
    setCountryOpen(false);
    setCountrySearch('');
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

    if (!draft.email.trim() || !draft.fullName.trim()) {
      setError('Email and full name are required.');
      return;
    }

    const cleanPhoneDigits = draft.localPhone.replace(/\D/g, '');
    if (!draft.localPhone.trim() || cleanPhoneDigits.length < 7) {
      setError('A working phone number is required (minimum 7 digits).');
      return;
    }

    if (!editingUser && !draft.password.trim()) {
      setError('A password is required when creating a user.');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-beige bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-warm-gray transition hover:bg-beige/40 hover:text-charcoal cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage/20 text-sage-dark">
            {editingUser ? <Edit3 className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
          </div>
          <div>
            <h2 id="user-modal-title" className="font-serif text-xl font-semibold text-charcoal">
              {editingUser ? 'Edit User Details' : 'Add New Client / User'}
            </h2>
            <p className="text-xs text-warm-gray">
              {editingUser
                ? `Updating account: ${editingUser.email}`
                : 'Create a managed account with assigned role and contact profile'}
            </p>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Unable to {editingUser ? 'update' : 'create'} user</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">
                Full name *
              </label>
              <input
                required
                value={draft.fullName}
                onChange={(event) => setDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="e.g. Sarah Jenkins"
                className="w-full rounded-2xl border border-beige bg-[#faf8f4] px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">
                Email address *
              </label>
              <input
                type="email"
                required
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="parent@example.com"
                className="w-full rounded-2xl border border-beige bg-[#faf8f4] px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">
                Country of residency
              </label>
              <button
                type="button"
                onClick={() => setCountryOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-2xl border border-beige bg-[#faf8f4] px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white text-left cursor-pointer"
                aria-haspopup="listbox"
                aria-expanded={countryOpen}
              >
                {selectedCountry ? (
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="truncate">{selectedCountry.name}</span>
                    <span className="text-xs text-warm-gray font-mono">({selectedCountry.iso})</span>
                  </span>
                ) : (
                  <span className="text-warm-gray/60 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-warm-gray/60" />
                    Select country
                  </span>
                )}
                <ChevronDown
                  className={`ml-2 h-4 w-4 shrink-0 text-warm-gray transition-transform ${
                    countryOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {countryOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-beige bg-white p-2 shadow-xl">
                  <div className="sticky top-0 z-10 bg-white pb-1.5">
                    <input
                      autoFocus
                      placeholder="Search country name or code..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3 py-1.5 text-xs text-charcoal outline-none focus:border-sage focus:bg-white"
                    />
                  </div>
                  <ul role="listbox" className="space-y-0.5">
                    {draft.country && (
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft((prev) => ({ ...prev, country: '' }));
                            setCountryOpen(false);
                            setCountrySearch('');
                          }}
                          className="flex w-full items-center px-3 py-1.5 text-left text-xs text-warm-gray hover:bg-[#faf8f4] rounded-xl italic cursor-pointer"
                        >
                          Clear country selection
                        </button>
                      </li>
                    )}
                    {filteredCountries.map((c) => {
                      const isSelected = draft.country === c.iso || draft.country === c.name;
                      return (
                        <li key={c.iso} role="option" aria-selected={isSelected}>
                          <button
                            type="button"
                            onClick={() => handleCountrySelect(c.iso)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition rounded-xl cursor-pointer ${
                              isSelected
                                ? 'bg-sage/15 font-medium text-sage-dark'
                                : 'text-charcoal hover:bg-[#faf8f4]'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span>{c.flag}</span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span className="text-[10px] text-warm-gray font-mono">{c.iso}</span>
                          </button>
                        </li>
                      );
                    })}
                    {filteredCountries.length === 0 && (
                      <li className="px-3 py-2 text-center text-xs text-warm-gray">No matching countries</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <PhoneInput
                label="Working phone number *"
                value={`${draft.dialCode}${draft.localPhone}`}
                onChange={(val) => {
                  const { dialCode, local } = parsePhone(val || null);
                  setDraft((prev) => ({ ...prev, dialCode, localPhone: local }));
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">City</label>
              <input
                value={draft.city}
                onChange={(event) => setDraft((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="e.g. Cairo, Dubai, London"
                className="w-full rounded-2xl border border-beige bg-[#faf8f4] px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">
                Address / Street
              </label>
              <input
                value={draft.address}
                onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Street, building, apartment"
                className="w-full rounded-2xl border border-beige bg-[#faf8f4] px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">
                {editingUser ? 'New password (leave blank to keep current)' : 'Account Password *'}
              </label>
              <input
                type="password"
                value={draft.password}
                onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={editingUser ? '••••••••' : 'Minimum 6 characters'}
                className="w-full rounded-2xl border border-beige bg-[#faf8f4] px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">Role</label>
              <select
                value={draft.role}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, role: event.target.value as 'student' | 'admin' }))
                }
                className="w-full rounded-2xl border border-beige bg-[#faf8f4] px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white cursor-pointer"
              >
                <option value="student">Student / Client (Default)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-3 border-t border-beige/80">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-beige bg-white px-5 py-2.5 text-sm font-medium text-charcoal transition hover:bg-[#faf8f4] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-sage px-6 py-2.5 text-sm font-medium text-white transition hover:bg-sage-dark disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : editingUser ? (
                'Save Changes'
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
