import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import type { UserProfile } from '../../types';

const AdminUsers = (): JSX.Element => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async (): Promise<void> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect((): void => {
    void fetchUsers();
  }, []);

  const toggleRole = async (user: UserProfile): Promise<void> => {
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    setUpdatingId(user.id);
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id);
    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
    }
    setUpdatingId(null);
  };

  return (
    <AdminLayout title="Users">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
        </div>
      ) : (
        <div className="rounded-[24px] border border-beige bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige bg-cream text-left text-xs font-medium uppercase tracking-wider text-warm-gray">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-warm-gray">
                      No users found.
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-cream/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-charcoal">
                      {user.full_name ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-warm-gray">{user.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-sage/20 text-sage-dark'
                            : 'bg-beige text-warm-gray'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-warm-gray">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleRole(user)}
                        disabled={updatingId === user.id}
                        className="rounded-xl border border-beige px-3 py-1 text-xs text-warm-gray hover:border-sage hover:text-sage-dark transition-colors disabled:opacity-50"
                      >
                        {updatingId === user.id
                          ? 'Saving…'
                          : user.role === 'admin'
                          ? 'Remove admin'
                          : 'Make admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
