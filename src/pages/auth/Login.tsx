import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Sparkles } from 'lucide-react';
import AnimatedSection from '../../components/ui/AnimatedSection';
import { useAuth } from '../../context/AuthContext';

/* ── Typing quotes ────────────────────────────────────────────────────────── */
const QUOTES = [
  "Gentle guidance creates steady growth for both parent and child.",
  "Every time you choose patience, you teach your child peace.",
  "You are doing better than you think — keep going.",
  "Connection before correction: the heart of mindful parenting.",
  "Small, consistent moments of love shape a lifetime.",
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

/* ── Shared input class ───────────────────────────────────────────────────── */
const inputCls =
  'w-full rounded-xl border border-beige bg-white px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage placeholder:text-warm-gray/50';

/* ── Component ────────────────────────────────────────────────────────────── */
const Login = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle, signInWithMagicLink } = useAuth();
  const typedQuote = useTypewriter(QUOTES);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) { setError(signInError.message); return; }
    navigate(from);
  };

  const handleGoogle = async (): Promise<void> => {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
  };

  const handleMagicLink = async (): Promise<void> => {
    if (!email) { setError('Please enter your email address first.'); return; }
    setError(null);
    setMagicLinkLoading(true);
    const { error: err } = await signInWithMagicLink(email);
    setMagicLinkLoading(false);
    if (err) { setError(err.message); return; }
    setMagicLinkSent(true);
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
              Mai Elbadawy
            </div>
            <h1 className="mt-3 font-serif text-3xl leading-snug">
              Welcome back — your journey continues here.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/75">
              Sign in to return to your courses, reflection journal, and the community that supports you every step of the way.
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
            <div className="mx-auto w-full max-w-md">

              {/* Header */}
              <div className="mb-7">
                <h2 className="font-serif text-3xl text-charcoal">Welcome back</h2>
                <p className="mt-1 text-base text-warm-gray">Log in to continue your parent coaching journey.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">

                {/* Email */}
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-charcoal">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="login-password" className="text-sm font-medium text-charcoal">
                      Password
                    </label>
                    <Link to="/auth/forgot-password" className="text-sm font-medium text-sage-dark hover:text-sage">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputCls} pr-10`}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-terracotta">{error}</p>}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-full bg-sage py-3 text-base font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading
                    ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    : 'Log in'}
                </button>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3 text-sm text-warm-gray">
                <div className="h-px flex-1 bg-beige" />
                <span>or</span>
                <div className="h-px flex-1 bg-beige" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-beige bg-white py-3 text-base font-medium text-charcoal transition hover:bg-cream"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.97-4.31 2.97-7.53Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.41 13.91A6.02 6.02 0 0 1 6.41 10.1V7.52H3.07a10 10 0 0 0 0 12.78l3.34-2.58Z" />
                  <path fill="#EA4335" d="M12 6.04c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.97 9.97 0 0 0 12 2a10 10 0 0 0-8.93 5.52l3.34 2.58C7.2 7.8 9.4 6.04 12 6.04Z" />
                </svg>
                Continue with Google
              </button>

              {/* Magic link */}
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={magicLinkLoading}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-full border border-beige bg-cream py-3 text-base font-medium text-charcoal transition hover:bg-beige disabled:opacity-60"
              >
                <Mail className="h-5 w-5" />
                {magicLinkLoading ? 'Sending…' : 'Send me a login link'}
              </button>

              {magicLinkSent && (
                <p className="mt-3 text-sm text-sage-dark">Check your email — we've sent you a magic link.</p>
              )}

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between text-sm text-warm-gray">
                <span>
                  Don't have an account?{' '}
                  <Link to="/auth/register" className="font-medium text-sage-dark hover:text-sage">Sign up</Link>
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

export default Login;
