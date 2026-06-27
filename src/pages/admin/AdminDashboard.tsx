import { useEffect, useState } from 'react';
import { Users, MessageSquare, BookOpen, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';

interface Stats {
  totalUsers: number;
  totalMessages: number;
  totalEnrollments: number;
  activeEnrollments: number;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}): JSX.Element => (
  <div className="rounded-[24px] border border-beige bg-white p-6 shadow-sm">
    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <p className="mt-4 text-sm text-warm-gray">{label}</p>
    <p className="mt-1 font-serif text-3xl text-charcoal">{value}</p>
  </div>
);

const AdminDashboard = (): JSX.Element => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalMessages: 0,
    totalEnrollments: 0,
    activeEnrollments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentMessages, setRecentMessages] = useState<
    { id: string; name: string; subject: string; created_at: string }[]
  >([]);

  useEffect((): void => {
    const fetchStats = async (): Promise<void> => {
      const [usersRes, messagesRes, enrollmentsRes, activeRes, recentMsgsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
        supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
        supabase
          .from('course_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('contact_messages')
          .select('id, name, subject, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        totalMessages: messagesRes.count ?? 0,
        totalEnrollments: enrollmentsRes.count ?? 0,
        activeEnrollments: activeRes.count ?? 0,
      });
      setRecentMessages(recentMsgsRes.data ?? []);
      setLoading(false);
    };

    void fetchStats();
  }, []);

  return (
    <AdminLayout title="Dashboard Overview">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-sage" />
            <StatCard
              icon={MessageSquare}
              label="Contact Messages"
              value={stats.totalMessages}
              color="bg-amber-400"
            />
            <StatCard
              icon={BookOpen}
              label="Total Enrollments"
              value={stats.totalEnrollments}
              color="bg-rose-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Active Enrollments"
              value={stats.activeEnrollments}
              color="bg-blue-400"
            />
          </div>

          {/* Recent messages */}
          <div className="rounded-[24px] border border-beige bg-white p-6 shadow-sm">
            <h2 className="font-serif text-xl text-charcoal mb-4">Recent Contact Messages</h2>
            {recentMessages.length === 0 ? (
              <p className="text-sm text-warm-gray">No messages yet.</p>
            ) : (
              <div className="divide-y divide-beige">
                {recentMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-charcoal">{msg.name}</p>
                      <p className="text-xs text-warm-gray">{msg.subject}</p>
                    </div>
                    <span className="text-xs text-warm-gray">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
