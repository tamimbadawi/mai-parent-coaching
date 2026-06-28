import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AuthCallback = (): JSX.Element => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let isMounted = true;

    const handleCallback = async (): Promise<void> => {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (sessionError || !data.session) {
        setError(sessionError?.message ?? 'We could not complete the sign-in.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, approval_status')
        .eq('id', data.session.user.id)
        .maybeSingle<{ role: 'student' | 'admin'; approval_status: 'pending' | 'approved' | 'rejected' }>();

      if (profile?.role === 'admin') {
        void navigate('/admin', { replace: true });
        return;
      }

      if (profile?.approval_status !== 'approved') {
        void navigate('/auth/pending-approval', { replace: true });
        return;
      }

      void navigate('/dashboard', { replace: true });
    };

    void handleCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto max-w-lg rounded-[32px] border border-beige bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <h2 className="font-serif text-3xl text-charcoal">We couldn’t finish signing you in</h2>
            <p className="mt-3 text-sm text-warm-gray">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="mt-6 rounded-full bg-sage px-6 py-3 text-sm font-medium text-white hover:bg-sage-dark"
            >
              Go back to login
            </button>
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
