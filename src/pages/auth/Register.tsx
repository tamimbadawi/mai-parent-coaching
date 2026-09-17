import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import AnimatedSection from '../../components/ui/AnimatedSection';
import { useAuth } from '../../context/AuthContext';
import PhoneInput from '../../components/ui/PhoneInput';

/* ── Typing quotes ────────────────────────────────────────────────────────── */
const QUOTES = [
  "You don't have to be perfect to be a wonderful parent.",
  "Every small step you take is a giant leap for your family.",
  "Growth begins the moment you decide to show up for yourself.",
  "A supported parent raises a supported child.",
  "You are not alone — this community walks with you.",
];

const useTypewriter = (texts: string[], typingSpeed = 55, pauseMs = 2200, deleteSpeed = 28) => {
  const [displayed, setDisplayed] = useState('');
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');
  const charIdx = useRef(0);

  useEffect(() => {
    const current = texts[quoteIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (charIdx.current < current.length) {
        timer = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx.current + 1));
          charIdx.current += 1;
        }, typingSpeed);
      } else {
        timer = setTimeout(() => setPhase('pausing'), pauseMs);
      }
    } else if (phase === 'pausing') {
      setPhase('deleting');
    } else {
      if (charIdx.current > 0) {
        timer = setTimeout(() => {
          charIdx.current -= 1;
          setDisplayed(current.slice(0, charIdx.current));
        }, deleteSpeed);
      } else {
        setQuoteIdx((i) => (i + 1) % texts.length);
        setPhase('typing');
      }
    }
    return () => clearTimeout(timer);
  }, [displayed, phase, quoteIdx, texts, typingSpeed, pauseMs, deleteSpeed]);

  return displayed;
};

/* ── Country list ─────────────────────────────────────────────────────────── */
interface CountryOption { iso: string; name: string; flag: string; }

const COUNTRIES: CountryOption[] = [
  { iso: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { iso: 'AL', name: 'Albania', flag: '🇦🇱' },
  { iso: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { iso: 'AO', name: 'Angola', flag: '🇦🇴' },
  { iso: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { iso: 'AU', name: 'Australia', flag: '🇦🇺' },
  { iso: 'AT', name: 'Austria', flag: '🇦🇹' },
  { iso: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
  { iso: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { iso: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { iso: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { iso: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { iso: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { iso: 'CA', name: 'Canada', flag: '🇨🇦' },
  { iso: 'CL', name: 'Chile', flag: '🇨🇱' },
  { iso: 'CN', name: 'China', flag: '🇨🇳' },
  { iso: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { iso: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { iso: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { iso: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { iso: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { iso: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { iso: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { iso: 'FI', name: 'Finland', flag: '🇫🇮' },
  { iso: 'FR', name: 'France', flag: '🇫🇷' },
  { iso: 'DE', name: 'Germany', flag: '🇩🇪' },
  { iso: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { iso: 'GR', name: 'Greece', flag: '🇬🇷' },
  { iso: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { iso: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { iso: 'IN', name: 'India', flag: '🇮🇳' },
  { iso: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { iso: 'IR', name: 'Iran', flag: '🇮🇷' },
  { iso: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { iso: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { iso: 'IL', name: 'Israel', flag: '🇮🇱' },
  { iso: 'IT', name: 'Italy', flag: '🇮🇹' },
  { iso: 'JP', name: 'Japan', flag: '🇯🇵' },
  { iso: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { iso: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { iso: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { iso: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { iso: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { iso: 'LY', name: 'Libya', flag: '🇱🇾' },
  { iso: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { iso: 'MV', name: 'Maldives', flag: '🇲🇻' },
  { iso: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { iso: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { iso: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { iso: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { iso: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { iso: 'NO', name: 'Norway', flag: '🇳🇴' },
  { iso: 'OM', name: 'Oman', flag: '🇴🇲' },
  { iso: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { iso: 'PS', name: 'Palestine', flag: '🇵🇸' },
  { iso: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { iso: 'PL', name: 'Poland', flag: '🇵🇱' },
  { iso: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { iso: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { iso: 'RO', name: 'Romania', flag: '🇷🇴' },
  { iso: 'RU', name: 'Russia', flag: '🇷🇺' },
  { iso: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { iso: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { iso: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { iso: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { iso: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { iso: 'ES', name: 'Spain', flag: '🇪🇸' },
  { iso: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { iso: 'SD', name: 'Sudan', flag: '🇸🇩' },
  { iso: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { iso: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { iso: 'SY', name: 'Syria', flag: '🇸🇾' },
  { iso: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { iso: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { iso: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { iso: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { iso: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { iso: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { iso: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { iso: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { iso: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', flag: '🇺🇸' },
  { iso: 'YE', name: 'Yemen', flag: '🇾🇪' },
  { iso: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { iso: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
].sort((a, b) => a.name.localeCompare(b.name));

/* ── Shared input class ───────────────────────────────────────────────────── */
const inputCls =
  'w-full rounded-xl border border-beige bg-white px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage placeholder:text-warm-gray/50';

/* ── Component ────────────────────────────────────────────────────────────── */
const Register = (): JSX.Element => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();
  const typedQuote = useTypewriter(QUOTES);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedCountry = COUNTRIES.find((c) => c.iso === country) ?? null;
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.iso.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name.';
    if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Enter a valid email.';
    const cleanDigits = phone.replace(/\D/g, '');
    if (!phone.trim() || cleanDigits.length < 7) next.phone = 'Enter a valid working phone number (min. 7 digits).';
    if (!country) next.country = 'Select your country.';
    if (!password) next.password = 'Enter a password.';
    if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp(email, password, fullName, phone || undefined, country || undefined);
    setLoading(false);
    if (error) {
      const msg = error.message ?? '';
      setSubmitError(
        msg.toLowerCase().includes('after') && msg.toLowerCase().includes('seconds')
          ? 'Please wait a moment before trying again.'
          : msg,
      );
      return;
    }
    navigate('/auth/verify-email', { state: { email } });
  };

  const handleGoogle = async (): Promise<void> => {
    setSubmitError(null);
    const { error } = await signInWithGoogle();
    if (error) setSubmitError(error.message);
  };

  return (
    <div className="flex min-h-screen flex-col pt-16">
      <div className="flex flex-1">

        {/* ── Left decorative panel ── */}
        <div className="hidden lg:flex lg:w-[42%] flex-col justify-between bg-sage px-10 py-8 text-white">

          {/* Top */}
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Join the community
            </div>
            <h1 className="mt-3 font-serif text-3xl leading-snug">
              "A calm, supported parent builds a stronger home."
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/75">
              Create your account to track your learning, join the community, and pick up right where you left off.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '2,400+', label: 'Members' },
              { value: '18', label: 'Courses' },
              { value: '4.9★', label: 'Rating' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/20 bg-white/10 px-3 py-3 text-center">
                <div className="font-serif text-xl font-semibold">{s.value}</div>
                <div className="mt-0.5 text-xs text-white/70">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Typewriter quote box */}
          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 px-6 py-5">
            {/* decorative circles */}
            <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full border border-white/20" />
            <div className="pointer-events-none absolute -bottom-3 -left-3 h-14 w-14 rounded-full border border-white/20" />
            <p className="relative font-serif text-base italic leading-relaxed text-white/90 min-h-[3.5rem]">
              "{typedQuote}
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-white/80 align-middle" />
              "
            </p>
            <div className="mt-3 text-xs font-medium uppercase tracking-widest text-white/50">Daily reminder</div>
          </div>

        </div>

        {/* ── Right form panel ── */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-ivory px-6 py-8 sm:px-12">
          <AnimatedSection delay={0.05} className="flex h-full flex-col justify-center">
            <div className="mx-auto w-full max-w-xl">

              {/* Header */}
              <div className="mb-5">
                <h2 className="font-serif text-3xl text-charcoal">Create your account</h2>
                <p className="mt-1 text-base text-warm-gray">Start your supportive coaching experience.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>

                {/* Row 1: Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-charcoal">Full name</label>
                    <input id="reg-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className={inputCls} placeholder="Your name" />
                    {errors.fullName && <p className="mt-1 text-xs text-terracotta">{errors.fullName}</p>}
                  </div>
                  <div>
                    <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-charcoal">Email address</label>
                    <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputCls} placeholder="you@example.com" />
                    {errors.email && <p className="mt-1 text-xs text-terracotta">{errors.email}</p>}
                  </div>
                </div>

                {/* Row 2: Phone + Country */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-charcoal">Phone number</label>
                    <PhoneInput value={phone} onChange={setPhone} inputClassName="py-2.5 rounded-xl text-sm" />
                    {errors.phone && <p className="mt-1 text-xs text-terracotta">{errors.phone}</p>}
                  </div>
                  <div>
                    <label htmlFor="reg-country" className="mb-1.5 block text-sm font-medium text-charcoal">Country of residency</label>
                    <div className="relative">
                      <button id="reg-country" type="button" onClick={() => setCountryOpen((p) => !p)}
                        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition ${country ? 'text-charcoal' : 'text-warm-gray/50'} ${errors.country ? 'border-terracotta' : 'border-beige focus:border-sage'}`}
                        aria-haspopup="listbox" aria-expanded={countryOpen}>
                        <span className="flex items-center gap-2 truncate">
                          {selectedCountry
                            ? <><span>{selectedCountry.flag}</span><span className="truncate">{selectedCountry.name}</span></>
                            : 'Select country'}
                        </span>
                        <svg className={`ml-1 h-4 w-4 shrink-0 text-warm-gray transition-transform ${countryOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {countryOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-beige bg-white shadow-lg">
                          <div className="p-2">
                            <input autoFocus placeholder="Search..." value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              className="w-full rounded-lg border border-beige px-3 py-2 text-sm text-charcoal outline-none focus:border-sage" />
                          </div>
                          <ul className="max-h-44 overflow-y-auto pb-1" role="listbox">
                            {filteredCountries.map((c) => (
                              <li key={c.iso} role="option" aria-selected={country === c.iso}>
                                <button type="button"
                                  onClick={() => { setCountry(c.iso); setCountryOpen(false); setCountrySearch(''); }}
                                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-cream ${country === c.iso ? 'bg-sage/10 font-medium text-sage-dark' : 'text-charcoal'}`}>
                                  <span>{c.flag}</span>
                                  <span className="truncate">{c.name}</span>
                                </button>
                              </li>
                            ))}
                            {filteredCountries.length === 0 && <li className="px-3 py-2 text-sm text-warm-gray">No results</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                    {errors.country && <p className="mt-1 text-xs text-terracotta">{errors.country}</p>}
                  </div>
                </div>

                {/* Row 3: Password + Confirm */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-charcoal">Password</label>
                    <div className="relative">
                      <input id="reg-password" type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-10`} placeholder="Create a password" />
                      <button type="button" onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray" aria-label={showPassword ? 'Hide' : 'Show'}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-terracotta">{errors.password}</p>}
                  </div>
                  <div>
                    <label htmlFor="reg-confirm" className="mb-1.5 block text-sm font-medium text-charcoal">Confirm password</label>
                    <div className="relative">
                      <input id="reg-confirm" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputCls} pr-10`} placeholder="Re-enter password" />
                      <button type="button" onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray" aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-terracotta">{errors.confirmPassword}</p>}
                  </div>
                </div>

                {submitError && <p className="mt-2 text-sm text-terracotta">{submitError}</p>}

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="mt-5 flex w-full items-center justify-center rounded-full bg-sage py-3 text-base font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70">
                  {loading
                    ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    : 'Create account'}
                </button>
              </form>

              {/* Divider */}
              <div className="my-4 flex items-center gap-3 text-sm text-warm-gray">
                <div className="h-px flex-1 bg-beige" />
                <span>or</span>
                <div className="h-px flex-1 bg-beige" />
              </div>

              {/* Google */}
              <button type="button" onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-beige bg-white py-3 text-base font-medium text-charcoal transition hover:bg-cream">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.97-4.31 2.97-7.53Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.41 13.91A6.02 6.02 0 0 1 6.41 10.1V7.52H3.07a10 10 0 0 0 0 12.78l3.34-2.58Z" />
                  <path fill="#EA4335" d="M12 6.04c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.97 9.97 0 0 0 12 2a10 10 0 0 0-8.93 5.52l3.34 2.58C7.2 7.8 9.4 6.04 12 6.04Z" />
                </svg>
                Continue with Google
              </button>

              {/* Footer links */}
              <div className="mt-4 flex items-center justify-between text-sm text-warm-gray">
                <span>
                  Already have an account?{' '}
                  <Link to="/auth/login" className="font-medium text-sage-dark hover:text-sage">Log in</Link>
                </span>
                <span className="text-soft-gray">
                  <Link to="/terms" className="hover:text-sage">Terms</Link>
                  {' · '}
                  <Link to="/privacy" className="hover:text-sage">Privacy</Link>
                </span>
              </div>

            </div>
          </AnimatedSection>
        </div>

      </div>
    </div>
  );
};

export default Register;
