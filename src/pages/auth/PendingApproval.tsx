import { Link } from 'react-router-dom';
import { Hourglass, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PendingApproval = (): JSX.Element => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-beige bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage/10 text-sage-dark">
          <Hourglass className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-serif text-4xl text-charcoal">Your account is waiting for approval</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-warm-gray">
          {profile?.full_name ?? 'Your account'} has been created successfully, but access is paused until an admin reviews and approves the registration.
        </p>

        <div className="mt-8 rounded-[24px] border border-beige bg-cream p-6 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sage-dark">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">Admin has been notified</p>
              <p className="mt-2 text-sm leading-6 text-warm-gray">
                Once your account is approved, you can sign in normally and access the member area.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full bg-sage px-6 py-3 text-sm font-medium text-white transition hover:bg-sage-dark"
          >
            Sign out
          </button>
          <Link
            to="/contact"
            className="rounded-full border border-beige px-6 py-3 text-sm font-medium text-charcoal transition hover:bg-cream"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;