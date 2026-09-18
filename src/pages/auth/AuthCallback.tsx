import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AuthCallback = (): JSX.Element => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let isMounted = true;
    let handled = false;

    const processProfileAndRedirect = async (userId: string): Promise<void> => {
      if (handled || !isMounted) return;
      handled = true;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, approval_status, phone, country')
          .eq('id', userId)
          .maybeSingle<{
            role: 'student' | 'admin';
            approval_status: 'pending' | 'approved' | 'rejected';
            phone: string | null;
            country: string | null;
          }>();

        if (!isMounted) return;

        if (profile?.role === 'admin') {
          void navigate('/admin', { replace: true });
          return;
        }

        const cleanDigits = (profile?.phone || '').replace(/\D/g, '');
        if (!profile?.phone || cleanDigits.length < 7) {
          void navigate('/auth/complete-profile', { replace: true });
          return;
        }

        void navigate('/', { replace: true });
      } catch (err) {
        console.error('AuthCallback - Profile query exception:', err);
        if (isMounted) {
          void navigate('/', { replace: true });
        }
      }
    };

    const handleAuth = async (): Promise<void> => {
      // 1. Check for PKCE ?code= in URL query params
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        try {
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            console.error('AuthCallback - Code exchange error:', exchangeErr);
          } else if (data.session?.user) {
            await processProfileAndRedirect(data.session.user.id);
            return;
          }
        } catch (e) {
          console.error('AuthCallback - Code exchange exception:', e);
        }
      }

      // 2. Check for hash parameters (#access_token=...&refresh_token=...)
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          try {
            const { data, error: setSessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!setSessionErr && data.session?.user) {
              await processProfileAndRedirect(data.session.user.id);
              return;
            }
          } catch (e) {
            console.error('AuthCallback - Set session exception:', e);
          }
        }
      }

      // 3. Check existing getSession
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        await processProfileAndRedirect(sessionData.session.user.id);
        return;
      }
    };

    // 4. Set up onAuthStateChange listener to catch session as soon as Supabase client resolves tokens
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted || handled) return;
      if (session?.user) {
        await processProfileAndRedirect(session.user.id);
      }
    });

    void handleAuth();

    // 5. Safety fallback timer if token resolution takes longer than expected
    const timeout = setTimeout(async () => {
      if (!isMounted || handled) return;
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await processProfileAndRedirect(data.session.user.id);
      } else {
        setError('Authentication is taking longer than usual. Please click below to continue to your home page.');
      }
    }, 4000);

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto max-w-lg rounded-[32px] border border-beige bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <h2 className="font-serif text-3xl text-charcoal">Almost there</h2>
            <p className="mt-3 text-sm text-warm-gray">{error}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-full bg-sage px-6 py-3 text-sm font-medium text-white hover:bg-sage-dark"
              >
                Go to Homepage
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth/login')}
                className="rounded-full border border-beige px-6 py-3 text-sm font-medium text-charcoal hover:bg-cream"
              >
                Go to Login
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage/10 text-sage-dark">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="mt-6 font-serif text-3xl text-charcoal">Signing you in…</h2>
            <p className="mt-3 text-sm text-warm-gray">Please wait while we complete your secure sign-in.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
