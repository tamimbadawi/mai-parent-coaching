import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Sparkles } from 'lucide-react';
import AnimatedSection from '../../components/AnimatedSection';
import { useAuth } from '../../context/AuthContext';

const Login = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle, signInWithMagicLink } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState<boolean>(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    navigate(from);
  };

  const handleGoogle = async (): Promise<void> => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
  };

  const handleMagicLink = async (): Promise<void> => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    setError(null);
    setMagicLinkLoading(true);
    const { error } = await signInWithMagicLink(email);
    setMagicLinkLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMagicLinkSent(true);
  };

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col overflow-hidden rounded-[32px] border border-beige bg-white shadow-sm lg:flex-row">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-sage p-10 text-white">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">Mai Elbadawy</div>
            <h1 className="mt-6 font-serif text-4xl leading-tight">
              “Gentle guidance creates steady growth for both parent and child.”
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/80">
              Sign in to return to your reflection journal, courses, and supportive resources.
            </p>
          </div>
          <div className="relative mt-12 h-40 overflow-hidden rounded-[24px] border border-white/20 bg-white/10">
            <div className="absolute left-6 top-6 h-20 w-20 rounded-full border border-white/30" />
            <div className="absolute bottom-6 right-8 h-16 w-16 rounded-full border border-white/30" />
            <div className="absolute right-12 top-10 h-24 w-24 rounded-full border border-white/20" />
          </div>
        </div>

        <div className="flex w-full items-center justify-center bg-ivory p-6 sm:p-8 lg:w-1/2 lg:p-10">
          <AnimatedSection delay={0.05}>
            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/10 text-sage-dark lg:mx-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-4 font-serif text-3xl text-charcoal">Welcome back</h2>
                <p className="mt-2 text-sm text-warm-gray">Log in to continue your parent coaching journey.</p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-charcoal">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    aria-label="Email address"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-charcoal">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      aria-label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-2xl border border-beige bg-white px-4 py-3 pr-12 text-sm text-charcoal outline-none transition focus:border-sage"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error ? <p className="text-sm text-terracotta">{error}</p> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-full bg-sage px-6 py-3 text-sm font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Log in'}
                </button>
              </form>

              <div className="mt-4 text-right">
                <Link to="/auth/forgot-password" className="text-sm font-medium text-sage-dark hover:text-sage">
                  Forgot your password?
                </Link>
              </div>

              <div className="my-6 flex items-center gap-3 text-sm text-warm-gray">
                <div className="h-px flex-1 bg-beige" />
                <span>or</span>
                <div className="h-px flex-1 bg-beige" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-beige bg-white px-6 py-3 text-sm font-medium text-charcoal transition hover:bg-cream"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.97-4.31 2.97-7.53Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.41 13.91A6.02 6.02 0 0 1 6.41 10.1V7.52H3.07a10 10 0 0 0 0 12.78l3.34-2.58Z" />
                  <path fill="#EA4335" d="M12 6.04c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.97 9.97 0 0 0 12 2a10 10 0 0 0-8.93 5.52l3.34 2.58C7.2 7.8 9.4 6.04 12 6.04Z" />
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={magicLinkLoading}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-full border border-beige bg-cream px-6 py-3 text-sm font-medium text-charcoal transition hover:bg-beige"
              >
                <Mail className="h-4 w-4" />
                {magicLinkLoading ? 'Sending...' : 'Send me a login link'}
              </button>

              {magicLinkSent ? (
                <p className="mt-3 text-sm text-sage-dark">Check your email — we've sent you a magic link.</p>
              ) : null}

              <p className="mt-6 text-center text-sm text-warm-gray">
                Don’t have an account?{' '}
                <Link to="/auth/register" className="font-medium text-sage-dark hover:text-sage">
                  Sign up
                </Link>
              </p>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default Login;
