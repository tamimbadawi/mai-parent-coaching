import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Crown, Edit3, Loader2, Phone, PlusCircle, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import PhoneInput, { formatPhone, parsePhone } from '../../components/ui/PhoneInput';
import type { UserProfile } from '../../types';
import { EmptyPanel, InsightChip, Panel, StatCard } from './components/AdminUI';

interface UserDraft {
  email: string;
  fullName: string;
  dialCode: string;
  localPhone: string;
  password: string;
  role: UserProfile['role'];
}

const emptyDraft: UserDraft = {
  email: '',
  fullName: '',
  dialCode: '+20',
  localPhone: '',
  password: '',
  role: 'student',
};

const AdminUsers = (): JSX.Element => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const adminCount = users.filter((user) => user.role === 'admin').length;
  const memberCount = users.length - adminCount;
  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [users]
  );

  const fetchUsers = async (): Promise<void> => {

    // Get the current session token and pass it explicitly so RLS works
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError('No active session — please log out and back in.');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(`Failed to load users: ${data?.message ?? response.status}`);
        setUsers([]);
      } else {
        setUsers(data ?? []);
      }
    } catch (err) {
      setError(`Failed to load users: ${err instanceof Error ? err.message : String(err)}`);
      setUsers([]);
    }

  };

  useEffect((): void => {
    void fetchUsers();
  }, []);

  useEffect((): (() => void) => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && composerOpen) {
        closeComposer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [composerOpen]);

  const openCreate = (): void => {
    setComposerOpen(true);
    setEditingUser(null);
    setDraft(emptyDraft);
    setError(null);
    setSuccess(null);
  };

  const openEdit = (user: UserProfile): void => {
    const { dialCode, local } = parsePhone(user.phone);
    setComposerOpen(true);
    setEditingUser(user);
    setDraft({
      email: user.email,
      fullName: user.full_name ?? '',
      dialCode,
      localPhone: local,
      password: '',
      role: user.role,
    });
    setError(null);
    setSuccess(null);
  };

  const closeComposer = (): void => {
    setComposerOpen(false);
    setEditingUser(null);
    setDraft(emptyDraft);
    setError(null);
  };

  const invokeUserManager = async (payload: Record<string, unknown>): Promise<{ error?: string; profile?: UserProfile }> => {
    console.log('[AdminUsers] invokeUserManager called with action:', payload.action);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        return { error: 'No active session. Please log out and back in.' };
      }

      // Use raw fetch so we can read the exact response text
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const functionUrl = `${supabaseUrl}/functions/v1/admin-user-manager`;

      console.log('[AdminUsers] Calling:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log('[AdminUsers] HTTP status:', response.status, '| Raw response:', responseText);

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(responseText);
          errMsg = parsed.error ?? parsed.message ?? errMsg;
        } catch { /* not JSON */ }
        return { error: errMsg };
      }

      let data: { error?: string; profile?: UserProfile };
      try {
        data = JSON.parse(responseText);
      } catch {
        return { error: `Could not parse response: ${responseText}` };
      }

      if (data.error) return { error: data.error };
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AdminUsers] invokeUserManager threw:', err);
      return { error: `Network error: ${msg}` };
    }
  };

  const saveUser = async (): Promise<void> => {
    setError(null);
    setSuccess(null);

    if (!draft.email.trim() || !draft.fullName.trim()) {
      setError('Email and full name are required.');
      return;
    }

    const cleanPhoneDigits = draft.localPhone.replace(/\D/g, '');
    if (!draft.localPhone.trim() || cleanPhoneDigits.length < 7) {
      setError('A working phone number is required (minimum 7 digits).');
      return;
    }

    if (!editingUser && !draft.password.trim()) {
      setError('A password is required when creating a user.');
      return;
    }

    const phone = formatPhone(draft.dialCode, draft.localPhone);

    const payload = editingUser
      ? {
          action: 'updateUser',
          userId: editingUser.id,
          email: draft.email.trim(),
          password: draft.password.trim() || undefined,
          fullName: draft.fullName.trim(),
          phone,
          role: draft.role,
          approvalStatus: 'approved',
        }
      : {
          action: 'createUser',
          email: draft.email.trim(),
          password: draft.password.trim(),
          fullName: draft.fullName.trim(),
          phone,
          role: draft.role,
          approvalStatus: 'approved',
        };

    setUpdatingId(editingUser?.id ?? 'new-user');
    try {
      const result = await invokeUserManager(payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      await fetchUsers();
      setSuccess(editingUser ? 'User updated successfully.' : 'User created successfully.');
      closeComposer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Unexpected error: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleRole = async (user: UserProfile): Promise<void> => {
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    setUpdatingId(user.id);
    const result = await invokeUserManager({
      action: 'updateUser',
      userId: user.id,
      email: user.email,
      fullName: user.full_name ?? '',
      phone: user.phone,
      role: newRole,
      approvalStatus: user.approval_status ?? 'approved',
    });

    if (!result.error) {
      await fetchUsers();
    }
    setUpdatingId(null);
  };

  const deleteUser = async (user: UserProfile): Promise<void> => {
    const shouldDelete = window.confirm(`Delete ${user.email}? This removes the auth user and profile.`);

    if (!shouldDelete) {
      return;
    }

    setUpdatingId(user.id);
    const result = await invokeUserManager({ action: 'deleteUser', userId: user.id });

    if (result.error) {
      setError(result.error);
      setUpdatingId(null);
      return;
    }

    await fetchUsers();
    setUpdatingId(null);
    setSuccess('User deleted successfully.');
  };

  return (
    <AdminLayout title="Users">
      <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={UserRound} label="People in system" value={users.length} detail="Every profile currently accessible inside the admin workspace." tone="sage" />
            <StatCard icon={Crown} label="Administrators" value={adminCount} detail="Accounts able to access this control center and manage data." tone="amber" />
            <StatCard icon={ShieldCheck} label="Members" value={memberCount} detail="Standard customers learning, booking, and receiving resources." tone="sky" />
          </div>

          <Panel title="User control center" eyebrow="Roles and access">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm leading-6 text-warm-gray">
                Create accounts manually, adjust access, assign roles, and manage users without leaving the admin workspace.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-sage px-4 py-3 text-sm font-medium text-white transition hover:bg-sage-dark"
              >
                <PlusCircle className="h-4 w-4" /> Add user
              </button>
            </div>

            {error && !composerOpen ? <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            {success ? <p className="mb-4 rounded-2xl border border-sage/20 bg-sage/10 px-4 py-3 text-sm text-sage-dark">{success}</p> : null}

            {users.length === 0 ? (
              <EmptyPanel title="No users found" description="When new members sign up, they will appear here with role, join date, and access controls." />
            ) : (
              <div className="space-y-3">
                {sortedUsers.map((user) => (
                  <div key={user.id} className="rounded-[24px] border border-beige bg-cream p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-medium text-charcoal">{user.full_name ?? 'Unnamed member'}</p>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${user.role === 'admin' ? 'bg-sage text-white' : 'bg-white text-warm-gray'}`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-warm-gray">
                          <span>{user.email}</span>
                          {user.phone ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-charcoal bg-white/70 px-2 py-0.5 rounded-lg border border-beige/60">
                              <Phone className="h-3 w-3 text-sage-dark" />
                              {user.phone}
                            </span>
                          ) : (
                            <span className="text-xs text-rose-500 font-medium">No phone on file</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <InsightChip label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded-2xl border border-beige bg-white px-4 py-3 text-sm font-medium text-charcoal transition hover:border-sage hover:text-sage-dark"
                        >
                          <span className="inline-flex items-center gap-2"><Edit3 className="h-4 w-4" /> Edit</span>
                        </button>
                        <button
                          onClick={() => toggleRole(user)}
                          disabled={updatingId === user.id}
                          className="rounded-2xl border border-beige bg-white px-4 py-3 text-sm font-medium text-charcoal transition hover:border-sage hover:text-sage-dark disabled:opacity-50"
                        >
                          {updatingId === user.id ? 'Saving…' : user.role === 'admin' ? 'Remove admin access' : 'Promote to admin'}
                        </button>
                        {user.email !== 'admin@admin.com' ? (
                          <button
                            onClick={() => void deleteUser(user)}
                            disabled={updatingId === user.id}
                            className="rounded-2xl border border-beige bg-white px-4 py-3 text-sm font-medium text-charcoal transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                          >
                            <span className="inline-flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
      </div>

      {composerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeComposer();
            }
          }}
        >
          <div className="relative my-8 w-full max-w-lg rounded-2xl border border-beige bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={closeComposer}
              className="absolute right-4 top-4 rounded-xl p-2 text-warm-gray transition hover:bg-beige/40 hover:text-charcoal"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage/20 text-sage-dark">
                {editingUser ? <Edit3 className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              </div>
              <div>
                <h2 id="user-modal-title" className="font-serif text-xl font-semibold text-charcoal">
                  {editingUser ? 'Edit User Details' : 'Add New User'}
                </h2>
                <p className="text-xs text-warm-gray">
                  {editingUser ? `Updating account: ${editingUser.email}` : 'Create a managed account with assigned role'}
                </p>
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div className="flex-1">
                  <p className="font-semibold">Unable to {editingUser ? 'update' : 'create'} user</p>
                  <p className="mt-0.5 text-rose-700">{error}</p>
                </div>
              </div>
            ) : null}

            <form onSubmit={(e) => { e.preventDefault(); void saveUser(); }} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">Full name *</label>
                <input
                  required
                  value={draft.fullName}
                  onChange={(event) => setDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full rounded-2xl border border-beige bg-cream px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">Email *</label>
                <input
                  type="email"
                  required
                  value={draft.email}
                  onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="user@example.com"
                  className="w-full rounded-2xl border border-beige bg-cream px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
                />
              </div>

              <div>
                <PhoneInput
                  label="Working phone number *"
                  value={formatPhone(draft.dialCode, draft.localPhone) ?? ''}
                  onChange={(val) => {
                    const { dialCode, local } = parsePhone(val || null);
                    setDraft((prev) => ({ ...prev, dialCode, localPhone: local }));
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">
                  {editingUser ? 'New password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  value={draft.password}
                  onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder={editingUser ? '••••••••' : 'Minimum 6 characters'}
                  className="w-full rounded-2xl border border-beige bg-cream px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">Role</label>
                <select
                  value={draft.role}
                  onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value as UserProfile['role'] }))}
                  className="w-full rounded-2xl border border-beige bg-cream px-4 py-2.5 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
                >
                  <option value="student">Student (Member)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-3 border-t border-beige">
                <button
                  type="button"
                  onClick={closeComposer}
                  className="rounded-2xl border border-beige bg-white px-4 py-2.5 text-sm font-medium text-charcoal transition hover:bg-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === 'new-user' || (!!editingUser && updatingId === editingUser.id)}
                  className="rounded-2xl bg-sage px-5 py-2.5 text-sm font-medium text-white transition hover:bg-sage-dark disabled:opacity-50"
                >
                  {updatingId === 'new-user' || (!!editingUser && updatingId === editingUser.id) ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : editingUser ? (
                    'Save changes'
                  ) : (
                    'Create user'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
};

export default AdminUsers;
