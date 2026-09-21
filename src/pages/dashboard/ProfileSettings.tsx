import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import PhoneInput, { formatPhone, parsePhone } from '../../components/ui/PhoneInput';
import { COUNTRIES, type CountryOption } from '../../data/countries';
import DashboardLayout from './DashboardLayout';

const ProfileSettings = (): JSX.Element => {
  const { profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState<string>(profile?.full_name ?? '');
  const { dialCode: initDial, local: initLocal } = parsePhone(profile?.phone ?? null);
  const [dialCode, setDialCode] = useState<string>(initDial);
  const [localPhone, setLocalPhone] = useState<string>(initLocal);
  const [country, setCountry] = useState<string>(profile?.country ?? '');
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [countryOpen, setCountryOpen] = useState<boolean>(false);
  const [city, setCity] = useState<string>(profile?.city ?? '');
  const [address, setAddress] = useState<string>(profile?.address ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteValue, setDeleteValue] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      if (profile.full_name !== null && profile.full_name !== undefined) setFullName(profile.full_name);
      if (profile.phone) {
        const { dialCode: d, local: l } = parsePhone(profile.phone);
        setDialCode(d);
        setLocalPhone(l);
      }
      if (profile.country !== null && profile.country !== undefined) setCountry(profile.country);
      if (profile.city !== null && profile.city !== undefined) setCity(profile.city);
      if (profile.address !== null && profile.address !== undefined) setAddress(profile.address);
      if (profile.avatar_url !== null && profile.avatar_url !== undefined) setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = useMemo<CountryOption | null>(() => {
    if (!country) return null;
    return COUNTRIES.find((c) => c.iso === country || c.name.toLowerCase() === country.toLowerCase()) ?? null;
  }, [country]);

  const filteredCountries = useMemo<CountryOption[]>(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase().includes(q));
  }, [countrySearch]);

  const passwordStrength = useMemo<number>(() => {
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/\d/.test(newPassword)) score += 1;
    if (newPassword.length >= 12) score += 1;
    return score;
  }, [newPassword]);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await updateProfile({
      full_name: fullName.trim() || null,
      phone: formatPhone(dialCode, localPhone),
      country: country || null,
      city: city.trim() || null,
      address: address.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Profile updated successfully');
    window.setTimeout(() => setMessage(null), 3000);
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError('Use at least 8 characters, one uppercase letter, and one number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email ?? '',
      password,
    });

    if (signInError || !signInData.user) {
      setPasswordLoading(false);
      setPasswordError('Current password is incorrect.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (updateError) {
      setPasswordError(updateError.message);
      return;
    }

    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('Password updated successfully.');
  };

  const handleDelete = async (): Promise<void> => {
    if (deleteValue !== 'DELETE') {
      return;
    }

    // TODO: implement this through a Supabase Edge Function for security.
    setShowDeleteModal(false);
  };

  return (
    <DashboardLayout
      activeTab="profile"
    >
      <div className="h-full flex flex-col justify-between min-h-0 gap-2.5 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between rounded-2xl border border-beige/80 bg-white/90 px-4 py-2 shadow-xs shrink-0">
          <div>
            <h1 className="font-serif text-lg sm:text-xl text-charcoal font-medium">Profile Settings</h1>
            <p className="text-xs text-warm-gray">Manage your personal information, address, and security.</p>
          </div>
          {message && (
            <span className="rounded-full bg-sage/15 border border-sage/30 px-3 py-1 text-xs font-semibold text-sage-dark animate-fade-in">
              {message}
            </span>
          )}
        </div>

        {/* 2 Side-by-side Columns */}
        <div className="grid gap-3 md:grid-cols-2 flex-1 min-h-0 items-stretch overflow-hidden">
          {/* Left Column: Personal Information */}
          <section className="rounded-2xl border border-beige/80 bg-white/90 backdrop-blur-md p-3.5 sm:p-4 shadow-xs flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="pb-1.5 border-b border-beige/60">
                <h2 className="font-serif text-base text-charcoal font-medium">Personal Information</h2>
                <p className="text-xs text-warm-gray">Your profile details, delivery address, and contact info.</p>
              </div>

              <form id="profile-form" className="mt-2.5 space-y-2.5" onSubmit={handleSaveProfile}>
                <div>
                  <label htmlFor="profile-full-name" className="mb-0.5 block text-xs font-semibold text-charcoal">
                    Full Name
                  </label>
                  <input
                    id="profile-full-name"
                    aria-label="Full name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-xl border border-beige/80 bg-white px-3 py-1.5 text-sm text-charcoal outline-none transition focus:border-sage shadow-xs"
                  />
                </div>

                <div>
                  <label htmlFor="profile-email" className="mb-0.5 block text-xs font-semibold text-charcoal">
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    aria-label="Email"
                    value={profile?.email ?? ''}
                    disabled
                    className="w-full rounded-xl border border-beige/60 bg-cream/50 px-3 py-1.5 text-sm text-warm-gray cursor-not-allowed"
                  />
                </div>

                <div>
                  <PhoneInput
                    label="Phone Number"
                    value={formatPhone(dialCode, localPhone) ?? ''}
                    onChange={(val) => {
                      const { dialCode: d, local: l } = parsePhone(val || null);
                      setDialCode(d);
                      setLocalPhone(l);
                    }}
                  />
                </div>

                {/* Country & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div ref={countryRef} className="relative">
                    <label htmlFor="profile-country" className="mb-0.5 block text-xs font-semibold text-charcoal">
                      Country
                    </label>
                    <button
                      id="profile-country"
                      type="button"
                      onClick={() => setCountryOpen((p) => !p)}
                      className={`flex w-full items-center justify-between rounded-xl border border-beige/80 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-sage shadow-xs ${
                        country ? 'text-charcoal' : 'text-warm-gray/60'
                      }`}
                      aria-haspopup="listbox"
                      aria-expanded={countryOpen}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        {selectedCountry ? (
                          <>
                            <span>{selectedCountry.flag}</span>
                            <span className="truncate">{selectedCountry.name}</span>
                          </>
                        ) : (
                          'Select country'
                        )}
                      </span>
                      <svg
                        className={`ml-1 h-3.5 w-3.5 shrink-0 text-warm-gray transition-transform ${countryOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {countryOpen && (
                      <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-beige bg-white p-1.5 shadow-lg">
                        <input
                          autoFocus
                          placeholder="Search..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full rounded-lg border border-beige/80 px-2.5 py-1 text-xs text-charcoal outline-none focus:border-sage mb-1"
                        />
                        <ul className="max-h-40 overflow-y-auto" role="listbox">
                          {filteredCountries.map((c) => (
                            <li key={c.iso} role="option" aria-selected={country === c.iso || country === c.name}>
                              <button
                                type="button"
                                onClick={() => {
                                  setCountry(c.iso);
                                  setCountryOpen(false);
                                  setCountrySearch('');
                                }}
                                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs rounded-lg transition hover:bg-cream ${
                                  country === c.iso || country === c.name ? 'bg-sage/15 font-medium text-sage-dark' : 'text-charcoal'
                                }`}
                              >
                                <span>{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="profile-city" className="mb-0.5 block text-xs font-semibold text-charcoal">
                      City
                    </label>
                    <input
                      id="profile-city"
                      aria-label="City"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="e.g. Cairo, Dubai"
                      className="w-full rounded-xl border border-beige/80 bg-white px-3 py-1.5 text-sm text-charcoal outline-none transition focus:border-sage shadow-xs placeholder:text-warm-gray/40"
                    />
                  </div>
                </div>

                {/* Street / Shipping Address */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label htmlFor="profile-address" className="block text-xs font-semibold text-charcoal">
                      Address
                    </label>
                    <span className="text-[11px] text-warm-gray/70">Optional · For physical orders & delivery</span>
                  </div>
                  <input
                    id="profile-address"
                    aria-label="Address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Street name, building, apartment number"
                    className="w-full rounded-xl border border-beige/80 bg-white px-3 py-1.5 text-sm text-charcoal outline-none transition focus:border-sage shadow-xs placeholder:text-warm-gray/40"
                  />
                </div>

                <div>
                  <label htmlFor="profile-avatar" className="mb-0.5 block text-xs font-semibold text-charcoal">
                    Avatar Image URL
                  </label>
                  <input
                    id="profile-avatar"
                    aria-label="Avatar URL"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full rounded-xl border border-beige/80 bg-white px-3 py-1.5 text-sm text-charcoal outline-none transition focus:border-sage shadow-xs placeholder:text-warm-gray/40"
                  />
                </div>
              </form>
            </div>

            <div className="pt-2 border-t border-beige/60 shrink-0">
              <button
                type="submit"
                form="profile-form"
                disabled={saving}
                className="w-full rounded-xl bg-sage py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </section>

          {/* Right Column: Security & Danger Zone */}
          <section className="rounded-2xl border border-beige/80 bg-white/90 backdrop-blur-md p-3.5 sm:p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div>
              <div className="pb-1.5 border-b border-beige/60">
                <h2 className="font-serif text-base text-charcoal font-medium">Security & Password</h2>
                <p className="text-xs text-warm-gray">Keep your learning account secure.</p>
              </div>

              <form id="password-form" className="mt-2.5 space-y-2" onSubmit={handlePasswordChange}>
                <div>
                  <label htmlFor="current-password" className="mb-0.5 block text-xs font-semibold text-charcoal">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    aria-label="Current password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-beige/80 bg-white px-3 py-1.5 text-sm text-charcoal outline-none transition focus:border-sage shadow-xs"
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="mb-0.5 block text-xs font-semibold text-charcoal">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    aria-label="New password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-xl border border-beige/80 bg-white px-3 py-1.5 text-sm text-charcoal outline-none transition focus:border-sage shadow-xs"
                  />
                  <div className="mt-1 flex gap-1">
                    {[0, 1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1 flex-1 rounded-full transition ${
                          bar < passwordStrength ? 'bg-sage' : 'bg-beige/70'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-new-password" className="mb-0.5 block text-xs font-semibold text-charcoal">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-new-password"
                    aria-label="Confirm new password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-beige/80 bg-white px-3 py-1.5 text-sm text-charcoal outline-none transition focus:border-sage shadow-xs"
                  />
                </div>

                {passwordError && (
                  <p className={`text-xs font-medium ${passwordError.includes('successfully') ? 'text-sage-dark' : 'text-rose-600'}`}>
                    {passwordError}
                  </p>
                )}
              </form>
            </div>

            <div className="pt-2 border-t border-beige/60 space-y-2 shrink-0">
              <button
                type="submit"
                form="password-form"
                disabled={passwordLoading}
                className="w-full rounded-xl bg-sage py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>

              <div className="flex items-center justify-between pt-1 border-t border-beige/40 text-xs">
                <span className="text-warm-gray">Permanently delete account</span>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-lg border border-rose-200 px-2 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showDeleteModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/60 px-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-beige bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-charcoal font-medium">Delete account</h3>
                <p className="text-xs text-warm-gray">This action cannot be undone.</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-warm-gray">Type <strong className="text-charcoal font-semibold">DELETE</strong> below to confirm.</p>
            <input
              aria-label="Delete confirmation"
              value={deleteValue}
              onChange={(event) => setDeleteValue(event.target.value)}
              className="mt-2 w-full rounded-xl border border-beige bg-white px-3 py-1.5 text-sm text-charcoal outline-none transition focus:border-rose-400 shadow-xs"
              placeholder="DELETE"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-full border border-beige px-3.5 py-1 text-xs font-medium text-charcoal hover:bg-cream transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleteValue !== 'DELETE'}
                className="rounded-full bg-rose-600 px-3.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
};

export default ProfileSettings;
