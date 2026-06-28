import { useEffect, useState } from 'react';
import { BadgeCheck, BadgeDollarSign, CalendarClock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import type { CourseEnrollment } from '../../types';
import { courses as staticCourses } from '../../data/content';
import { EmptyPanel, Panel, StatCard } from './admin-ui';

interface EnrollmentRow extends CourseEnrollment {
  profiles: { full_name: string | null; email: string } | null;
}

const fallbackEnrollments: EnrollmentRow[] = [
  {
    id: 'sample-enrollment-1',
    user_id: 'sample-user-1',
    course_id: 'parenting-confidence',
    enrolled_at: new Date().toISOString(),
    payment_intent_id: 'pi_sample_1',
    amount_paid: 19700,
    status: 'active',
    profiles: { full_name: 'Dina Khaled', email: 'dina@example.com' },
  },
  {
    id: 'sample-enrollment-2',
    user_id: 'sample-user-2',
    course_id: 'burnout-recovery-course',
    enrolled_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    payment_intent_id: 'pi_sample_2',
    amount_paid: 24700,
    status: 'suspended',
    profiles: { full_name: 'Farah Samir', email: 'farah@example.com' },
  },
];

const statusColors: Record<string, string> = {
  active: 'bg-sage/20 text-sage-dark',
  refunded: 'bg-amber-100 text-amber-700',
  suspended: 'bg-rose-100 text-rose-600',
};

const AdminBookings = (): JSX.Element => {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>(fallbackEnrollments);
  const [loading, setLoading] = useState(false);

  const activeCount = enrollments.filter((entry) => entry.status === 'active').length;
  const revenue = enrollments.reduce((sum, entry) => sum + (entry.amount_paid ?? 0), 0);

  useEffect((): void => {
    const fetch = async (): Promise<void> => {
      setLoading(true);
      const { data } = await supabase
        .from('course_enrollments')
        .select('*, profiles(full_name, email)')
        .order('enrolled_at', { ascending: false });

      setEnrollments((data as EnrollmentRow[])?.length ? (data as EnrollmentRow[]) : fallbackEnrollments);
      setLoading(false);
    };

    void fetch();
  }, []);

  const courseName = (id: string): string => staticCourses.find((course) => course.id === id)?.title ?? id;

  const updateStatus = async (
    id: string,
    status: 'active' | 'refunded' | 'suspended'
  ): Promise<void> => {
    const { error } = await supabase.from('course_enrollments').update({ status }).eq('id', id);

    if (!error) {
      setEnrollments((prev) => prev.map((entry) => (entry.id === id ? { ...entry, status } : entry)));
    }
  };

  return (
    <AdminLayout title="Bookings & Enrollments">
      {enrollments.length === 0 ? (
        <EmptyPanel
          title="No enrollments yet"
          description="Once purchases or access grants begin, this area will become the operating board for bookings, payment statuses, and learner follow-through."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              icon={CalendarClock}
              label="Enrollment records"
              value={enrollments.length}
              detail="All recorded customer entries into the course ecosystem."
              tone="sage"
            />
            <StatCard
              icon={BadgeCheck}
              label="Active access"
              value={activeCount}
              detail="Learners presently in good standing and able to continue learning."
              tone="sky"
            />
            <StatCard
              icon={BadgeDollarSign}
              label="Tracked revenue"
              value={`$${(revenue / 100).toFixed(2)}`}
              detail="Captured value from enrollments that include payment amounts."
              tone="amber"
            />
          </div>

          <Panel title="Enrollment operations board" eyebrow="Bookings and learner status">
            <div className="space-y-3">
              {enrollments.map((entry) => (
                <article key={entry.id} className="rounded-[24px] border border-beige bg-cream p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-medium text-charcoal">{entry.profiles?.full_name ?? 'Unnamed learner'}</p>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${statusColors[entry.status] ?? ''}`}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-warm-gray">{entry.profiles?.email}</p>
                      <p className="mt-3 text-sm text-charcoal">{courseName(entry.course_id)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-2xl border border-beige bg-white px-4 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Enrolled</p>
                        <p className="mt-1 text-sm font-medium text-charcoal">{new Date(entry.enrolled_at).toLocaleDateString()}</p>
                      </div>
                      <div className="rounded-2xl border border-beige bg-white px-4 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Amount</p>
                        <p className="mt-1 text-sm font-medium text-charcoal">
                          {entry.amount_paid != null ? `$${(entry.amount_paid / 100).toFixed(2)}` : '—'}
                        </p>
                      </div>
                      <select
                        value={entry.status}
                        onChange={(event) => updateStatus(entry.id, event.target.value as 'active' | 'refunded' | 'suspended')}
                        className="rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                      >
                        <option value="active">Active</option>
                        <option value="refunded">Refunded</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBookings;
