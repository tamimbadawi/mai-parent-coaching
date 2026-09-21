import { useState, useEffect, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Phone, ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import AnimatedSection from '../../components/ui/AnimatedSection';
import { useAuth } from '../../context/AuthContext';
import PhoneInput from '../../components/ui/PhoneInput';
import { COUNTRIES, type CountryOption } from '../../data/countries';
import { dispatchWhatsAppMessage } from '../../lib/whatsappAdmin';

const CompleteProfile = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading, updateProfile, signOut } = useAuth();

  const [phone, setPhone] = useState(profile?.phone || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      void navigate('/auth/login', { replace: true });
      return;
    }

    if (!loading && profile) {
      if (profile.role === 'admin') {
        void navigate('/admin', { replace: true });
        return;
      }
      const cleanDigits = (profile.phone || '').replace(/\D/g, '');
      if (profile.phone && cleanDigits.length >= 7 && profile.country) {
        const from = (location.state as { from?: string } | null)?.from ?? '/';
        void navigate(from, { replace: true });
      }
    }
  }, [loading, user, profile, navigate, location.state]);

  useEffect(() => {
    if (profile?.phone && !phone) {
      setPhone(profile.phone);
    }
    if (profile?.country && !country) {
      setCountry(profile.country);
    }
  }, [profile, phone, country]);

  const selectedCountry: CountryOption | null = COUNTRIES.find((c) => c.iso === country || c.name === country) ?? null;
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.iso.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const cleanDigits = phone.replace(/\D/g, '');
    if (!phone.trim() || cleanDigits.length < 7) {
      next.phone = 'Please enter a valid working phone number (min. 7 digits).';
    }
    if (!country) {
      next.country = 'Please select your country of residence.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    const { error } = await updateProfile({
      phone: phone.trim(),
      country: country.trim(),
    });
    setSubmitting(false);

    if (error) {
      setSubmitError(error.message || 'Failed to update profile. Please try again.');
      return;
    }

    if (phone.trim().replace(/\D/g, '').length >= 7) {
      void dispatchWhatsAppMessage({
        trigger: 'onboarding',
        recipient_phone: phone.trim(),
        recipient_name: profile?.full_name || null,
      }).catch((err) => console.warn('Onboarding dispatch notice:', err));
    }

    const from = (location.state as { from?: string } | null)?.from;
    if (from) {
      void navigate(from, { replace: true });
    } else if (profile?.role === 'admin') {
      void navigate('/admin', { replace: true });
    } else {
      void navigate('/', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory pt-20 pb-12 px-4 sm:px-6">
      <div className="mx-auto max-w-xl">
        <AnimatedSection delay={0.05}>
          <div className="rounded-[32px] border border-beige bg-white p-6 sm:p-10 shadow-sm">
            
            {/* Header icon */}
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage/10 text-sage-dark">
                <Phone className="h-6 w-6" />
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 text-xs font-medium text-warm-gray hover:text-charcoal transition"
                title="Sign out and use another account"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>

            <div className="mt-6">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark">
                Almost there
              </span>
              <h1 className="mt-2 font-serif text-3xl text-charcoal">
                Complete your profile
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-warm-gray">
                Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}! Please provide your phone number so we can reach you for coaching updates, session reminders, and direct support.
              </p>
            </div>

            {/* User details badge */}
            <div className="mt-5 flex items-center justify-between rounded-2xl border border-beige bg-cream px-4 py-3 text-xs text-warm-gray">
              <div>
                <span className="font-medium text-charcoal">{profile?.full_name || user?.user_metadata?.full_name || 'Member'}</span>
                <span className="mx-2 text-soft-gray">·</span>
                <span>{profile?.email || user?.email}</span>
              </div>
              <span className="flex items-center gap-1 text-sage-dark font-medium">
                <ShieldCheck className="h-3.5 w-3.5" /> Google Verified
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              
              {/* Phone */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Phone number <span className="text-terracotta">*</span>
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  inputClassName="py-2.5 rounded-xl text-sm"
                />
                {errors.phone ? (
                  <p className="mt-1 text-xs text-terracotta">{errors.phone}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-warm-gray">
                    Used for WhatsApp/SMS session reminders and direct communication.
                  </p>
                )}
              </div>

              {/* Country */}
              <div>
                <label htmlFor="comp-country" className="mb-1.5 block text-sm font-medium text-charcoal">
                  Country of residency <span className="text-terracotta">*</span>
                </label>
                <div className="relative">
                  <button
                    id="comp-country"
                    type="button"
                    onClick={() => setCountryOpen((p: boolean) => !p)}
                    className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition ${
                      country ? 'text-charcoal' : 'text-warm-gray/50'
                    } ${errors.country ? 'border-terracotta' : 'border-beige focus:border-sage'}`}
                    aria-haspopup="listbox"
                    aria-expanded={countryOpen}
                  >
                    <span className="flex items-center gap-2 truncate">
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
                      className={`ml-1 h-4 w-4 shrink-0 text-warm-gray transition-transform ${
                        countryOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {countryOpen ? (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-beige bg-white shadow-lg">
                      <div className="p-2">
                        <input
                          autoFocus
                          placeholder="Search country..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full rounded-lg border border-beige px-3 py-2 text-sm text-charcoal outline-none focus:border-sage"
                        />
                      </div>
                      <ul className="max-h-48 overflow-y-auto pb-1" role="listbox">
                        {filteredCountries.map((c) => (
                          <li key={c.iso} role="option" aria-selected={country === c.iso || country === c.name}>
                            <button
                              type="button"
                              onClick={() => {
                                setCountry(c.name);
                                setCountryOpen(false);
                                setCountrySearch('');
                              }}
                              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-cream ${
                                country === c.iso || country === c.name
                                  ? 'bg-sage/10 font-medium text-sage-dark'
                                  : 'text-charcoal'
                              }`}
                            >
                              <span>{c.flag}</span>
                              <span className="truncate">{c.name}</span>
                            </button>
                          </li>
                        ))}
                        {filteredCountries.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-warm-gray">No results</li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                </div>
                {errors.country ? (
                  <p className="mt-1 text-xs text-terracotta">{errors.country}</p>
                ) : null}
              </div>

              {submitError ? (
                <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 p-3 text-xs text-terracotta">
                  {submitError}
                </div>
              ) : null}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-sage py-3 text-base font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Save and continue</span>
                  </>
                )}
              </button>
            </form>

          </div>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default CompleteProfile;
