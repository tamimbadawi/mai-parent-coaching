import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import AnimatedSection from '../../components/ui/AnimatedSection';
import { supabase } from '../../lib/supabase';

const ResetPassword = (): JSX.Element => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(true);

  useEffect((): void => {
    const verifySession = async (): Promise<void> => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setIsValid(false);
      }
    };

    void verifySession();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
  };

  if (!isValid) {
    return (
      <div className="min-h-screen bg-ivory pt-24">
        <div className="mx-auto max-w-2xl rounded-[32px] border border-beige bg-white p-8 text-center shadow-sm">
          <h2 className="font-serif text-3xl text-charcoal">That link is no longer valid</h2>
          <p className="mt-3 text-sm text-warm-gray">Please request a new reset link to continue.</p>
          <Link to="/auth/forgot-password" className="mt-6 inline-flex rounded-full bg-sage px-6 py-3 text-sm font-medium text-white hover:bg-sage-dark">
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-beige bg-white p-8 shadow-sm">
        <AnimatedSection delay={0.05}>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/10 text-sage-dark">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-serif text-3xl text-charcoal">Set a new password</h2>
            <p className="mt-2 text-sm text-warm-gray">Enter your new password for your account.</p>
          </div>

          {success ? (
            <div className="mt-8 rounded-2xl border border-beige bg-cream p-6 text-center">
              <h3 className="font-serif text-2xl text-charcoal">Password updated!</h3>
              <p className="mt-2 text-sm text-warm-gray">You can now sign in with your new password.</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-6 rounded-full bg-sage px-6 py-3 text-sm font-medium text-white hover:bg-sage-dark"
              >
                Go to Home
              </button>
            </div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-charcoal">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    aria-label="New password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-beige bg-white px-4 py-3 pr-12 text-sm text-charcoal outline-none transition focus:border-sage"
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

              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-charcoal">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    aria-label="Confirm password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-2xl border border-beige bg-white px-4 py-3 pr-12 text-sm text-charcoal outline-none transition focus:border-sage"
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
              </div>

              {error ? <p className="text-sm text-terracotta">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-full bg-sage px-6 py-3 text-sm font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Update password'}
              </button>
            </form>
          )}
        </AnimatedSection>
      </div>
    </div>
  );
};

export default ResetPassword;
