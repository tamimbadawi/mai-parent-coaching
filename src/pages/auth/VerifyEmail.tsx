import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Sparkles } from 'lucide-react';
import AnimatedSection from '../../components/ui/AnimatedSection';
import { supabase } from '../../lib/supabase';

const VerifyEmail = (): JSX.Element => {
  const location = useLocation();
  const [cooldown, setCooldown] = useState<number>(0);
  const state = location.state as { email?: string } | null;
  const email = state?.email ?? '';

  const countdownLabel = useMemo(() => (cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'), [cooldown]);

  const handleResend = async (): Promise<void> => {
    if (!email || cooldown > 0) {
      return;
    }

    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (!error) {
      setCooldown(60);
      const interval = window.setInterval(() => {
        setCooldown((value) => {
          if (value <= 1) {
            window.clearInterval(interval);
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-beige bg-white p-8 text-center shadow-sm">
        <AnimatedSection delay={0.05}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/10 text-sage-dark">
            <Mail className="h-8 w-8" />
          </div>
          <div className="mt-6 flex justify-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-sage/20">
              <div className="absolute h-12 w-12 rounded-full border border-sage/20" />
              <Sparkles className="h-6 w-6 text-sage-dark" />
            </div>
          </div>
          <h2 className="mt-6 font-serif text-3xl text-charcoal">Verify your email</h2>
          <p className="mt-3 text-sm leading-7 text-warm-gray">
            We sent a confirmation link to <span className="font-medium text-charcoal">{email || 'your email'}</span>.
            Click it to activate your account.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={cooldown > 0}
              className="rounded-full bg-sage px-6 py-3 text-sm font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {countdownLabel}
            </button>
            <Link to="/auth/register" className="text-sm font-medium text-sage-dark hover:text-sage">
              Wrong email?
            </Link>
            <Link to="/auth/login" className="text-sm font-medium text-sage-dark hover:text-sage">
              Already confirmed? Sign in
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default VerifyEmail;
