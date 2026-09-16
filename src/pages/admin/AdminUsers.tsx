import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Crown, Edit3, Hourglass, PlusCircle, ShieldCheck, Trash2, UserRound, X, XCircle } from 'lucide-react';
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
  approvalStatus: UserProfile['approval_status'];
}

const emptyDraft: UserDraft = {
  email: '',
  fullName: '',
  dialCode: '+20',
  localPhone: '',
  password: '',
  role: 'student',
  approvalStatus: 'pending',
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
  const pendingCount = users.filter((user) => user.approval_status === 'pending').length;
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
      approvalStatus: user.approval_status,
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
          approvalStatus: draft.approvalStatus,
        }
      : {
          action: 'createUser',
          email: draft.email.trim(),
          password: draft.password.trim(),
          fullName: draft.fullName.trim(),
          phone,
          role: draft.role,
          approvalStatus: draft.approvalStatus,
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
      approvalStatus: user.approval_status,
    });

    if (!result.error) {
      await fetchUsers();
    }
    setUpdatingId(null);
  };

  const updateApproval = async (
    user: UserProfile,
    approvalStatus: 'approved' | 'pending' | 'rejected'
  ): Promise<void> => {
    setUpdatingId(user.id);
    const result = await invokeUserManager({
      action: 'updateUser',
      userId: user.id,
      email: user.email,
      fullName: user.full_name ?? '',
      phone: user.phone,
      role: user.role,
      approvalStatus,
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

  const approvalTone: Record<UserProfile['approval_status'], string> = {
    approved: 'bg-sage text-white',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-rose-100 text-rose-600',
  };

  return (
    <AdminLayout title="Users">
      <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard icon={UserRound} label="People in system" value={users.length} detail="Every profile currently accessible inside the admin workspace." tone="sage" />
            <StatCard icon={Crown} label="Administrators" value={adminCount} detail="Accounts able to access this control center and manage data." tone="amber" />
            <StatCard icon={ShieldCheck} label="Members" value={memberCount} detail="Standard customers learning, booking, and receiving resources." tone="sky" />
            <StatCard icon={Hourglass} label="Awaiting approval" value={pendingCount} detail="Registrations currently blocked until you manually approve them." tone="rose" />
          </div>

          <Panel title="User control center" eyebrow="Roles and access">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm leading-6 text-warm-gray">
                Create accounts manually, adjust access, approve registrations, and remove users without leaving the admin workspace.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-sage px-4 py-3 text-sm font-medium text-white transition hover:bg-sage-dark"
              >
                <PlusCircle className="h-4 w-4" /> Add user
              </button>
            </div>

            {error ? <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            {success ? <p className="mb-4 rounded-2xl border border-sage/20 bg-sage/10 px-4 py-3 text-sm text-sage-dark">{success}</p> : null}

            {composerOpen ? (
              <div className="mb-5 rounded-[24px] border border-beige bg-cream p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">{editingUser ? 'Edit user' : 'Create user'}</p>
                    <h3 className="mt-1 font-serif text-2xl text-charcoal">{editingUser ? 'Update account details' : 'Add a new managed account'}</h3>
                  </div>
                  <button type="button" onClick={closeComposer} className="rounded-2xl border border-beige bg-white p-3 text-warm-gray transition hover:text-charcoal">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">Full name</label>
                    <input value={draft.fullName} onChange={(event) => setDraft((prev) => ({ ...prev, fullName: event.target.value }))} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-sage" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">Email</label>
                    <input type="email" value={draft.email} onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-sage" />
                  </div>
                  <div>
                    <PhoneInput
                      label="Phone"
                      value={formatPhone(draft.dialCode, draft.localPhone) ?? ''}
                      onChange={(val) => {
                        const { dialCode, local } = parsePhone(val || null);
                        setDraft((prev) => ({ ...prev, dialCode, localPhone: local }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">{editingUser ? 'New password (optional)' : 'Password'}</label>
                    <input type="password" value={draft.password} onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-sage" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">Role</label>
                    <select value={draft.role} onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value as UserProfile['role'] }))} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-sage">
                      <option value="student">Student</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">Approval status</label>
                    <select value={draft.approvalStatus} onChange={(event) => setDraft((prev) => ({ ...prev, approvalStatus: event.target.value as UserProfile['approval_status'] }))} className="w-full rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-sage">
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closeComposer} className="rounded-2xl border border-beige bg-white px-4 py-3 text-sm font-medium text-charcoal transition hover:bg-cream">
                    Cancel
                  </button>
                  <button type="button" onClick={() => void saveUser()} disabled={updatingId === 'new-user' || (!!editingUser && updatingId === editingUser.id)} className="rounded-2xl bg-sage px-4 py-3 text-sm font-medium text-white transition hover:bg-sage-dark disabled:opacity-50">
                    {editingUser ? 'Save changes' : 'Create user'}
                  </button>
                </div>
              </div>
            ) : null}

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
                          <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${approvalTone[user.approval_status]}`}>
                            {user.approval_status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-warm-gray">{user.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <InsightChip label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
                        <InsightChip label="Approved" value={user.approved_at ? new Date(user.approved_at).toLocaleDateString() : 'Not yet'} />
                        {user.role !== 'admin' ? (
                          <>
                            <button
                              onClick={() => updateApproval(user, 'approved')}
                              disabled={updatingId === user.id || user.approval_status === 'approved'}
                              className="rounded-2xl border border-beige bg-white px-4 py-3 text-sm font-medium text-charcoal transition hover:border-sage hover:text-sage-dark disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Approve</span>
                            </button>
                            <button
                              onClick={() => updateApproval(user, 'rejected')}
                              disabled={updatingId === user.id || user.approval_status === 'rejected'}
                              className="rounded-2xl border border-beige bg-white px-4 py-3 text-sm font-medium text-charcoal transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-2"><XCircle className="h-4 w-4" /> Reject</span>
                            </button>
                          </>
                        ) : null}
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
    </AdminLayout>
  );
};

export default AdminUsers;
