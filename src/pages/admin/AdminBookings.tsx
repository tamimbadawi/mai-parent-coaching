import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import type { CourseEnrollment } from '../../types';
import { courses as staticCourses } from '../../data/content';

interface EnrollmentRow extends CourseEnrollment {
  profiles: { full_name: string | null; email: string } | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-sage/20 text-sage-dark',
  refunded: 'bg-amber-100 text-amber-700',
  suspended: 'bg-rose-100 text-rose-600',
};

const AdminBookings = (): JSX.Element => {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect((): void => {
    const fetch = async (): Promise<void> => {
      const { data } = await supabase
        .from('course_enrollments')
        .select('*, profiles(full_name, email)')
        .order('enrolled_at', { ascending: false });
      setEnrollments((data as EnrollmentRow[]) ?? []);
      setLoading(false);
    };
    void fetch();
  }, []);

  const courseName = (id: string): string =>
    staticCourses.find((c) => c.id === id)?.title ?? id;

  const updateStatus = async (
    id: string,
    status: 'active' | 'refunded' | 'suspended'
  ): Promise<void> => {
    const { error } = await supabase
      .from('course_enrollments')
      .update({ status })
      .eq('id', id);
    if (!error) {
      setEnrollments((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    }
  };

  return (
    <AdminLayout title="Bookings & Enrollments">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="rounded-[24px] border border-beige bg-white p-12 text-center shadow-sm">
          <p className="text-warm-gray">No enrollments yet.</p>
        </div>
      ) : (
        <div className="rounded-[24px] border border-beige bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige bg-cream text-left text-xs font-medium uppercase tracking-wider text-warm-gray">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Enrolled</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige">
                {enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-cream/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-charcoal">
                        {e.profiles?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-warm-gray">{e.profiles?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-warm-gray">{courseName(e.course_id)}</td>
                    <td className="px-6 py-4 text-warm-gray">
                      {new Date(e.enrolled_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-charcoal">
                      {e.amount_paid != null ? `$${(e.amount_paid / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[e.status] ?? ''}`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={e.status}
                        onChange={(ev) =>
                          updateStatus(
                            e.id,
                            ev.target.value as 'active' | 'refunded' | 'suspended'
                          )
                        }
                        className="rounded-xl border border-beige bg-cream px-2 py-1 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                      >
                        <option value="active">Active</option>
                        <option value="refunded">Refunded</option>
                        <option value="suspended">Suspended</option>
                      </select>
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

export default AdminBookings;
