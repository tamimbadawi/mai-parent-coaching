import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Crown, Edit3, MapPin, Phone, PlusCircle, ShieldCheck, Sparkles, Trash2, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { COUNTRIES } from '../../data/countries';
import type { UserProfile } from '../../types';
import { EmptyPanel, InsightChip, Panel, StatCard } from './components/AdminUI';
import { UserComposerModal } from './components/UserComposerModal';

const AdminUsers = (): JSX.Element => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<'all' | 'admins' | 'clients'>('all');

  const adminCount = users.filter((user) => user.role === 'admin').length;
  const assistantCount = users.filter((user) => user.role === 'assistant').length;
  const memberCount = users.length - adminCount - assistantCount;
  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [users]
  );

  const displayedUsers = useMemo(() => {
    return sortedUsers.filter((user) => {
      if (roleFilter === 'admins') return user.role === 'admin' || user.role === 'assistant';
      if (roleFilter === 'clients') return user.role === 'student';
      return true;
    });
  }, [sortedUsers, roleFilter]);

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
        // Display all users authentically without dropping clients who don't have phone numbers
        setUsers((data ?? []) as UserProfile[]);
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
    setError(null);
    setSuccess(null);
  };

  const openEdit = (user: UserProfile): void => {
    setComposerOpen(true);
    setEditingUser(user);
    setError(null);
    setSuccess(null);
  };

  const closeComposer = (): void => {
    setComposerOpen(false);
    setEditingUser(null);
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



  const toggleRole = async (user: UserProfile, targetRole?: 'student' | 'admin' | 'assistant'): Promise<void> => {
    const newRole = targetRole || (user.role === 'admin' ? 'student' : user.role === 'assistant' ? 'admin' : 'assistant');
    setUpdatingId(user.id);
    const result = await invokeUserManager({
      action: 'updateUser',
      userId: user.id,
      email: user.email,
      fullName: user.full_name ?? '',
      phone: user.phone,
      country: user.country,
      role: newRole,
      approvalStatus: user.approval_status ?? 'approved',
    });

    if (!result.error) {
      await fetchUsers();
      setSuccess(`User role updated to ${newRole}.`);
    } else {
      setError(result.error);
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
            <StatCard icon={Crown} label="Admins & Team" value={adminCount + assistantCount} detail={`${adminCount} admin(s), ${assistantCount} assistant(s) with control center access.`} tone="amber" />
            <StatCard icon={ShieldCheck} label="Members" value={memberCount} detail="Standard customers learning, booking, and receiving resources." tone="sky" />
          </div>

          <Panel title="User control center" eyebrow="Roles and access">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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

            {/* Role Filter Tabs */}
            <div className="mb-5 flex flex-wrap items-center gap-1.5 p-1 bg-[#faf8f4] rounded-xl border border-beige/70 w-fit">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-white text-charcoal shadow-2xs font-semibold'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                All ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admins')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  roleFilter === 'admins'
                    ? 'bg-white text-amber-900 shadow-2xs font-semibold'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                Admins & Team ({adminCount + assistantCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('clients')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  roleFilter === 'clients'
                    ? 'bg-white text-charcoal shadow-2xs font-semibold'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                Clients ({memberCount})
              </button>
            </div>

            {error && !composerOpen ? <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            {success ? <p className="mb-4 rounded-2xl border border-sage/20 bg-sage/10 px-4 py-3 text-sm text-sage-dark">{success}</p> : null}

            {displayedUsers.length === 0 ? (
              <EmptyPanel
                title="No users found"
                description={
                  roleFilter === 'admins'
                    ? 'No administrators or assistants found matching this filter.'
                    : roleFilter === 'clients'
                    ? 'No client profiles found matching this filter.'
                    : 'When new members sign up, they will appear here with role, join date, and access controls.'
                }
              />
            ) : (
              <div className="space-y-3">
                {displayedUsers.map((user) => (
                  <div key={user.id} className="rounded-[24px] border border-beige bg-cream p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-medium text-charcoal">{user.full_name ?? 'Unnamed member'}</p>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${
                              user.role === 'admin'
                                ? 'bg-sage text-white'
                                : user.role === 'assistant'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                                : 'bg-white text-warm-gray border border-beige'
                            }`}
                          >
                            {user.role === 'assistant' ? 'Assistant · Follow-up Lead' : user.role}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-warm-gray">
                          {user.email && user.email.trim() && !user.email.includes('@historical.client') ? (
                            <span>{user.email}</span>
                          ) : (
                            <span className="italic text-warm-gray/60">No email on file</span>
                          )}
                          {user.phone && user.phone.trim() && !user.phone.startsWith('+20100000') ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-charcoal bg-white/70 px-2 py-0.5 rounded-lg border border-beige/60">
                              <Phone className="h-3 w-3 text-sage-dark" />
                              {user.phone}
                            </span>
                          ) : (
                            <span className="text-xs text-warm-gray/60 italic">No phone on file</span>
                          )}
                          {user.country ? (() => {
                            const cObj = COUNTRIES.find((c) => c.iso === user.country || c.name.toLowerCase() === user.country?.toLowerCase());
                            return (
                              <span className="flex items-center gap-1.5 text-xs font-medium text-charcoal bg-white/70 px-2 py-0.5 rounded-lg border border-beige/60" title={cObj?.name ?? user.country}>
                                <span>{cObj?.flag ?? '🌍'}</span>
                                <span>{cObj?.name ?? user.country}</span>
                              </span>
                            );
                          })() : null}
                          {user.city ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-charcoal bg-white/70 px-2 py-0.5 rounded-lg border border-beige/60">
                              <MapPin className="h-3 w-3 text-sage-dark" />
                              {user.city}
                            </span>
                          ) : null}
                          {user.address ? (
                            <span className="text-xs text-warm-gray bg-white/70 px-2 py-0.5 rounded-lg border border-beige/60 truncate max-w-[200px]" title={user.address}>
                              {user.address}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <InsightChip label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
                        {user.role === 'student' ? (
                          <Link
                            to={`/admin/crm?client=${user.id}`}
                            className="rounded-2xl border border-beige bg-[#faf8f4] px-4 py-3 text-sm font-medium text-charcoal transition hover:border-sage hover:text-sage-dark"
                          >
                            <span className="inline-flex items-center gap-2"><Compass className="h-4 w-4 text-sage-dark" /> CRM Dossier</span>
                          </Link>
                        ) : null}
                        <Link
                          to={`/admin/sessions?client=${user.id}`}
                          className="rounded-2xl border border-beige bg-[#faf8f4] px-4 py-3 text-sm font-medium text-charcoal transition hover:border-sage hover:text-sage-dark"
                        >
                          <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-sage-dark" /> Client Workspace</span>
                        </Link>
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded-2xl border border-beige bg-white px-4 py-3 text-sm font-medium text-charcoal transition hover:border-sage hover:text-sage-dark"
                        >
                          <span className="inline-flex items-center gap-2"><Edit3 className="h-4 w-4" /> Edit</span>
                        </button>
                        {user.role === 'student' ? (
                          <>
                            <button
                              onClick={() => toggleRole(user, 'assistant')}
                              disabled={updatingId === user.id}
                              className="rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                              title="Assign Assistant role (Client Follow-up Lead)"
                            >
                              {updatingId === user.id ? 'Saving…' : 'Make Assistant'}
                            </button>
                            <button
                              onClick={() => toggleRole(user, 'admin')}
                              disabled={updatingId === user.id}
                              className="rounded-2xl border border-beige bg-white px-3.5 py-3 text-sm font-medium text-charcoal transition hover:border-sage hover:text-sage-dark disabled:opacity-50"
                            >
                              {updatingId === user.id ? 'Saving…' : 'Make Admin'}
                            </button>
                          </>
                        ) : user.role === 'assistant' ? (
                          <>
                            <button
                              onClick={() => toggleRole(user, 'admin')}
                              disabled={updatingId === user.id}
                              className="rounded-2xl border border-beige bg-white px-3.5 py-3 text-sm font-medium text-charcoal transition hover:border-sage hover:text-sage-dark disabled:opacity-50"
                            >
                              {updatingId === user.id ? 'Saving…' : 'Promote to Admin'}
                            </button>
                            <button
                              onClick={() => toggleRole(user, 'student')}
                              disabled={updatingId === user.id}
                              className="rounded-2xl border border-beige bg-white px-3.5 py-3 text-sm font-medium text-warm-gray transition hover:border-beige hover:text-charcoal disabled:opacity-50"
                            >
                              {updatingId === user.id ? 'Saving…' : 'Demote to Student'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleRole(user, 'assistant')}
                              disabled={updatingId === user.id}
                              className="rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                            >
                              {updatingId === user.id ? 'Saving…' : 'Set as Assistant'}
                            </button>
                            <button
                              onClick={() => toggleRole(user, 'student')}
                              disabled={updatingId === user.id}
                              className="rounded-2xl border border-beige bg-white px-3.5 py-3 text-sm font-medium text-warm-gray transition hover:border-beige hover:text-charcoal disabled:opacity-50"
                            >
                              {updatingId === user.id ? 'Saving…' : 'Remove Admin'}
                            </button>
                          </>
                        )}
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

      <UserComposerModal
        isOpen={composerOpen}
        editingUser={editingUser}
        onClose={closeComposer}
        onSaved={(msg) => {
          setSuccess(msg);
          void fetchUsers();
        }}
      />
    </AdminLayout>
  );
};

export default AdminUsers;
