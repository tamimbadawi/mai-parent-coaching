import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const AuthCallback = (): JSX.Element => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  const doRedirect = (): void => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    if (profile?.role === 'admin') {
      void navigate('/admin', { replace: true });
    } else {
      void navigate('/', { replace: true });
    }
  };

  // 1. Reactive: As soon as AuthContext has user, redirect immediately
  useEffect(() => {
    if (user) {
      doRedirect();
    }
  }, [user, profile]);

  // 2. Direct token processing from hash & code
  useEffect((): (() => void) => {
    let isMounted = true;

    const handleTokens = async (): Promise<void> => {
      try {
        // Handle PKCE code
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { data } = await supabase.auth.exchangeCodeForSession(code);
          if (data.session?.user && isMounted) {
            doRedirect();
            return;
          }
        }

        // Handle Hash token (#access_token=...&refresh_token=...)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (data.session?.user && isMounted) {
              doRedirect();
              return;
            }
          }
        }

        // Check active session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user && isMounted) {
          doRedirect();
          return;
        }
      } catch (err) {
        console.error('AuthCallback processing exception:', err);
      }
    };

    void handleTokens();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMounted) {
        doRedirect();
      }
    });

    // 3. Absolute failsafe timer: after 1.5 seconds, redirect to homepage
    const fallbackTimer = setTimeout(() => {
      if (isMounted && !redirectedRef.current) {
        doRedirect();
      }
    }, 1500);

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto max-w-lg rounded-[32px] border border-beige bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <h2 className="font-serif text-3xl text-charcoal">Sign In Notice</h2>
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
            <p className="mt-3 text-sm text-warm-gray">Redirecting you to your homepage in a moment.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
