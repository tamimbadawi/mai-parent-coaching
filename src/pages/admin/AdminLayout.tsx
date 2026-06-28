import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  FileText,
  CalendarDays,
  ShoppingBag,
  LogOut,
  ShieldCheck,
  Bell,
  Search,
  ArrowRight,
  Home,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AdminNotification } from '../../types';

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/blog', label: 'Blog', icon: FileText },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout = ({ children, title }: AdminLayoutProps): JSX.Element => {
  const { pathname } = useLocation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect((): void => {
    const loadNotifications = async (): Promise<void> => {
      const { count } = await supabase
        .from('admin_notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);

      setNotificationCount(count ?? 0);
    };

    void loadNotifications();
  }, []);

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(221,231,214,0.8),_transparent_32%),linear-gradient(180deg,#fbf8f2_0%,#f6f0e6_100%)] px-4 py-6 sm:px-6 lg:px-8">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 lg:flex-row">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white/90 px-4 py-3 shadow-sm lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-charcoal text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg text-charcoal">Admin</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-xl border border-beige bg-white p-2 text-charcoal"
            aria-label="Toggle admin sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Sidebar */}
        <aside className={`
          fixed top-0 left-0 z-50 h-full w-[280px] overflow-y-auto bg-white shadow-2xl transition-transform duration-300 lg:shadow-none
          lg:static lg:z-auto lg:h-auto lg:w-[308px] lg:overflow-visible lg:translate-x-0 lg:bg-transparent
          flex shrink-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-4 lg:p-0 flex flex-col gap-4">
            <div className="rounded-[32px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(119,101,84,0.12)] backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-charcoal text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-charcoal">
                  {profile?.full_name?.split(' ')[0] ?? 'Admin'}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-warm-gray">Control Center</p>
                <p className="mt-3 max-w-[22ch] font-serif text-2xl leading-tight text-charcoal">
                  Quiet structure for a busy back office.
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-warm-gray">
              Oversee operations, review activity, and keep every customer-facing touchpoint consistent.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-sage/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-sage-dark">
                Admin
              </span>
              <span className="rounded-full bg-cream px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-warm-gray">
                Workspace
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <nav className="rounded-[32px] border border-stone-200/80 bg-[#2f2a2a] p-4 shadow-[0_18px_45px_rgba(50,40,34,0.16)]">
              <p className="px-3 pb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
                Navigation
              </p>
              <div className="space-y-1.5 text-sm">
                {navItems.map(({ to, label, icon: Icon }) => {
                  const isActive = pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${
                        isActive
                          ? 'bg-[#8fcfcb] text-charcoal shadow-[0_10px_24px_rgba(143,207,203,0.28)]'
                          : 'text-stone-200 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={isActive ? 'font-medium' : ''}>{label}</span>
                      </span>
                      <ArrowRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'translate-x-0' : 'opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100'}`} />
                    </Link>
                  );
                })}

                <button
                  onClick={handleSignOut}
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-stone-300 transition hover:bg-white/8 hover:text-white"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sign out
                </button>
              </div>
            </nav>

            <div className="rounded-[32px] border border-[#d8cfc2] bg-[linear-gradient(180deg,#f3ebde_0%,#efe5d7_100%)] p-5 shadow-[0_16px_38px_rgba(119,101,84,0.10)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Today</p>
                <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-charcoal">Focus</span>
              </div>
              <p className="mt-3 font-serif text-xl leading-tight text-charcoal">
                Three checks to keep the day under control.
              </p>
              <div className="mt-4 space-y-3">
                {[
                  'Reply to new leads before they cool off.',
                  'Review access changes, refunds, and learner friction.',
                  'Align current offers with content and booking availability.',
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/60 px-3 py-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-charcoal text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                    <p className="text-sm leading-6 text-charcoal">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>{/* end p-4 lg:p-0 */}
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="rounded-[32px] border border-beige/80 bg-white/80 p-5 shadow-sm shadow-stone-200/60 backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Admin Workspace</p>
                <h1 className="mt-1 font-serif text-4xl text-charcoal">{title}</h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/" className="flex items-center gap-2 rounded-2xl border border-beige bg-white px-4 py-3 text-sm font-medium text-charcoal hover:bg-cream transition-colors">
                  <Home className="h-4 w-4 text-sage-dark" />
                  Back to Website
                </Link>
                <div className="flex items-center gap-3 rounded-2xl border border-beige bg-cream px-4 py-3 text-sm text-warm-gray">
                  <Search className="h-4 w-4" />
                  Search people, content, or activity
                </div>
                <button type="button" className="flex items-center gap-2 rounded-2xl border border-beige bg-white px-4 py-3 text-sm font-medium text-charcoal">
                  <Bell className="h-4 w-4 text-sage-dark" />
                  {notificationCount} alerts
                </button>
              </div>
            </div>
          </div>
          <div className="mt-6"> 
          {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
