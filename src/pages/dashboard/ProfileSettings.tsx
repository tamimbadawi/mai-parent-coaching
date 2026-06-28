import { useMemo, useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import PhoneInput, { formatPhone, parsePhone } from '../../components/PhoneInput';

const ProfileSettings = (): JSX.Element => {
  const { profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState<string>(profile?.full_name ?? '');
  const [phone, setPhone] = useState<string>(profile?.phone ?? '');
  const { dialCode: initDial, local: initLocal } = parsePhone(profile?.phone ?? null);
  const [dialCode, setDialCode] = useState<string>(initDial);
  const [localPhone, setLocalPhone] = useState<string>(initLocal);
  const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteValue, setDeleteValue] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);

  const passwordStrength = useMemo<number>(() => {
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/\d/.test(newPassword)) score += 1;
    if (newPassword.length >= 12) score += 1;
    return score;
  }, [newPassword]);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await updateProfile({ full_name: fullName, phone: formatPhone(dialCode, localPhone), avatar_url: avatarUrl });
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Profile updated successfully');
    window.setTimeout(() => setMessage(null), 3000);
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError('Use at least 8 characters, one uppercase letter, and one number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email ?? '',
      password,
    });

    if (signInError || !signInData.user) {
      setPasswordLoading(false);
      setPasswordError('Current password is incorrect.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (updateError) {
      setPasswordError(updateError.message);
      return;
    }

    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('Password updated successfully.');
  };

  const handleDelete = async (): Promise<void> => {
    if (deleteValue !== 'DELETE') {
      return;
    }

    // TODO: implement this through a Supabase Edge Function for security.
    setShowDeleteModal(false);
  };

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-beige bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage/10 text-sage-dark">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-dark">Account</p>
              <h1 className="font-serif text-3xl text-charcoal">Profile Settings</h1>
            </div>
          </div>

          {message ? (
            <div className="mt-6 rounded-2xl border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-dark">{message}</div>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-[24px] border border-beige bg-cream p-6">
              <h2 className="font-serif text-2xl text-charcoal">Personal Information</h2>
              <form className="mt-6 space-y-4" onSubmit={handleSaveProfile}>
                <div>
                  <label htmlFor="profile-full-name" className="mb-2 block text-sm font-medium text-charcoal">
                    Full name
                  </label>
                  <input id="profile-full-name" aria-label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage" />
                </div>
                <div>
                  <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-charcoal">
                    Email
                  </label>
                  <input id="profile-email" aria-label="Email" value={profile?.email ?? ''} disabled className="w-full rounded-2xl border border-beige bg-white/70 px-4 py-3 text-sm text-warm-gray" />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="mb-2 block text-sm font-medium text-charcoal">
                    Phone
                  </label>
                  <PhoneInput
                    value={formatPhone(dialCode, localPhone) ?? ''}
                    onChange={(val) => {
                      const { dialCode: d, local: l } = parsePhone(val || null);
                      setDialCode(d);
                      setLocalPhone(l);
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="profile-avatar" className="mb-2 block text-sm font-medium text-charcoal">
                    Avatar URL
                  </label>
                  <input id="profile-avatar" aria-label="Avatar URL" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage" />
                </div>
                <button type="submit" disabled={saving} className="rounded-full bg-sage px-6 py-3 text-sm font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </section>

            <section className="rounded-[24px] border border-beige bg-white p-6">
              <h2 className="font-serif text-2xl text-charcoal">Change Password</h2>
              <form className="mt-6 space-y-4" onSubmit={handlePasswordChange}>
                <div>
                  <label htmlFor="current-password" className="mb-2 block text-sm font-medium text-charcoal">Current password</label>
                  <input id="current-password" aria-label="Current password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage" />
                </div>
                <div>
                  <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-charcoal">New password</label>
                  <input id="new-password" aria-label="New password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage" />
                  <div className="mt-2 flex gap-2">
                    {[0, 1, 2, 3].map((bar) => (
                      <div key={bar} className={`h-2 flex-1 rounded-full ${bar < passwordStrength ? 'bg-sage' : 'bg-beige'}`} />
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm-new-password" className="mb-2 block text-sm font-medium text-charcoal">Confirm new password</label>
                  <input id="confirm-new-password" aria-label="Confirm new password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage" />
                </div>
                {passwordError ? <p className="text-sm text-terracotta">{passwordError}</p> : null}
                <button type="submit" disabled={passwordLoading} className="rounded-full bg-sage px-6 py-3 text-sm font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70">
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </section>
          </div>

          <section className="mt-8 rounded-[24px] border border-terracotta/40 bg-terracotta/10 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 text-terracotta" />
              <div>
                <h3 className="font-serif text-2xl text-charcoal">Danger Zone</h3>
                <p className="mt-2 text-sm text-warm-gray">Deleting your account permanently removes your profile and learning history.</p>
                <button type="button" onClick={() => setShowDeleteModal(true)} className="mt-4 rounded-full border border-terracotta px-5 py-3 text-sm font-medium text-terracotta transition hover:bg-terracotta/10">
                  Delete Account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showDeleteModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] border border-beige bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-charcoal">Delete account</h3>
                <p className="text-sm text-warm-gray">This cannot be undone.</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-warm-gray">Type DELETE to confirm.</p>
            <input aria-label="Delete confirmation" value={deleteValue} onChange={(event) => setDeleteValue(event.target.value)} className="mt-3 w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage" />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="rounded-full border border-beige px-4 py-2 text-sm font-medium text-charcoal">Cancel</button>
              <button type="button" onClick={() => void handleDelete()} className="rounded-full bg-terracotta px-4 py-2 text-sm font-medium text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProfileSettings;
