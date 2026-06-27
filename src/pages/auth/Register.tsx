import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import AnimatedSection from '../../components/AnimatedSection';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const Register = (): JSX.Element => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const passwordStrength = useMemo<number>(() => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 10) score += 1;
    if (password.length >= 14) score += 1;
    return score;
  }, [password]);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (fullName.trim().length < 2) {
      nextErrors.fullName = 'Please enter your full name.';
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (password.length < 6) {
      nextErrors.password = 'Use at least 6 characters.';
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      const msg = error.message ?? '';
      setSubmitError(
        msg.toLowerCase().includes('after') && msg.toLowerCase().includes('seconds')
          ? 'Please wait a moment before trying again.'
          : msg
      );
      return;
    }

    navigate('/auth/verify-email', { state: { email } });
  };

  const handleGoogle = async (): Promise<void> => {
    setSubmitError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setSubmitError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col overflow-hidden rounded-[32px] border border-beige bg-white shadow-sm lg:flex-row">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-sage p-10 text-white">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">Join the community</div>
            <h1 className="mt-6 font-serif text-4xl leading-tight">
              “A calm, supported parent builds a stronger home.”
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/80">
              Create your account to keep track of your learning, join the community, and return to your next step with ease.
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
                <h2 className="mt-4 font-serif text-3xl text-charcoal">Create your account</h2>
                <p className="mt-2 text-sm text-warm-gray">Start your supportive coaching experience.</p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="register-name" className="mb-2 block text-sm font-medium text-charcoal">
                    Full name
                  </label>
                  <input
                    id="register-name"
                    aria-label="Full name"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage"
                    placeholder="Your name"
                    required
                  />
                  {errors.fullName ? <p className="mt-1 text-sm text-terracotta">{errors.fullName}</p> : null}
                </div>

                <div>
                  <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-charcoal">
                    Email address
                  </label>
                  <input
                    id="register-email"
                    aria-label="Email address"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage"
                    placeholder="you@example.com"
                    required
                  />
                  {errors.email ? <p className="mt-1 text-sm text-terracotta">{errors.email}</p> : null}
                </div>

                <div>
                  <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-charcoal">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      aria-label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-2xl border border-beige bg-white px-4 py-3 pr-12 text-sm text-charcoal outline-none transition focus:border-sage"
                      placeholder="Create a password"
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
                  <div className="mt-2 flex gap-2">
                    {[0, 1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className={cn('h-2 flex-1 rounded-full', bar < passwordStrength ? 'bg-sage' : 'bg-beige')}
                      />
                    ))}
                  </div>
                  {errors.password ? <p className="mt-1 text-sm text-terracotta">{errors.password}</p> : null}
                </div>

                <div>
                  <label htmlFor="register-confirm" className="mb-2 block text-sm font-medium text-charcoal">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="register-confirm"
                      aria-label="Confirm password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-2xl border border-beige bg-white px-4 py-3 pr-12 text-sm text-charcoal outline-none transition focus:border-sage"
                      placeholder="Re-enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword ? <p className="mt-1 text-sm text-terracotta">{errors.confirmPassword}</p> : null}
                </div>

                {submitError ? <p className="text-sm text-terracotta">{submitError}</p> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-full bg-sage px-6 py-3 text-sm font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Create account'}
                </button>
              </form>

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

              <p className="mt-6 text-center text-sm text-warm-gray">
                Already have an account?{' '}
                <Link to="/auth/login" className="font-medium text-sage-dark hover:text-sage">
                  Log in
                </Link>
              </p>

              <p className="mt-3 text-center text-xs text-soft-gray">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-sage-dark hover:text-sage">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-sage-dark hover:text-sage">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default Register;
