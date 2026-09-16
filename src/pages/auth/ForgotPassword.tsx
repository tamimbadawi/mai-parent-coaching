import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Sparkles } from 'lucide-react';
import AnimatedSection from '../../components/ui/AnimatedSection';
import { supabase } from '../../lib/supabase';

const ForgotPassword = (): JSX.Element => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    if (error) {
      const msg = error.message ?? '';
      setError(
        msg.toLowerCase().includes('after') && msg.toLowerCase().includes('seconds')
          ? 'Please wait a moment before trying again.'
          : msg
      );
      return;
    }

    setMessage(`We sent a password reset link to ${email}`);
  };

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col overflow-hidden rounded-[32px] border border-beige bg-white shadow-sm lg:flex-row">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-sage p-10 text-white">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">Reset access</div>
            <h1 className="mt-6 font-serif text-4xl leading-tight">A calm reset can help you step back in confidently.</h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/80">We’ll send a secure link so you can choose a new password.</p>
          </div>
        </div>

        <div className="flex w-full items-center justify-center bg-ivory p-6 sm:p-8 lg:w-1/2 lg:p-10">
          <AnimatedSection delay={0.05}>
            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/10 text-sage-dark lg:mx-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-4 font-serif text-3xl text-charcoal">Forgot your password?</h2>
                <p className="mt-2 text-sm text-warm-gray">Enter your email and we’ll send a reset link.</p>
              </div>

              {!message ? (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="forgot-email" className="mb-2 block text-sm font-medium text-charcoal">
                      Email address
                    </label>
                    <input
                      id="forgot-email"
                      aria-label="Email address"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage"
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  {error ? <p className="text-sm text-terracotta">{error}</p> : null}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-full bg-sage px-6 py-3 text-sm font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Send reset link'}
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-beige bg-cream p-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage/10 text-sage-dark">
                    <Mail className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 font-serif text-2xl text-charcoal">Check your inbox</h3>
                  <p className="mt-2 text-sm text-warm-gray">{message}</p>
                  <Link to="/auth/login" className="mt-6 inline-flex text-sm font-medium text-sage-dark hover:text-sage">
                    Back to login
                  </Link>
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
