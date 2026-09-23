import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  FileText,
  CalendarDays,
  ShoppingBag,
  LogOut,
  Bell,
  ArrowUpRight,
  Menu,
  X,
  MessageCircle,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  headerContent?: React.ReactNode;
}

const AdminLayout = ({ children, title, subtitle, action, headerContent }: AdminLayoutProps): JSX.Element => {
  const { pathname } = useLocation();
  const { profile, signOut } = useAuth();
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
    window.location.href = '/auth/login';
  };

  const navGroups: NavGroup[] = [
    {
      group: 'Practice',
      items: [
        { to: '/admin', label: 'Overview', icon: LayoutDashboard },
        { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
        { to: '/admin/crm', label: 'Client CRM', icon: HeartHandshake },
        { to: '/admin/sessions', label: 'Session Notes', icon: Sparkles, badge: 'Super' },
        { to: '/admin/messages', label: 'Inbox', icon: MessageSquare },
        { to: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
      ],
    },
    {
      group: 'Content',
      items: [
        { to: '/admin/courses', label: 'Courses', icon: BookOpen },
        { to: '/admin/blog', label: 'Blog & Resources', icon: FileText },
        { to: '/admin/orders', label: 'Shop & Orders', icon: ShoppingBag },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f4] text-charcoal flex flex-col lg:flex-row antialiased lg:p-3 lg:gap-3">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile top header bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-beige/60 bg-[#1f1c1d] px-4 py-3.5 text-white lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <span className="font-serif text-xl tracking-tight text-white">
            Mai <span className="text-sage font-normal">Elbadawy</span>
          </span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs uppercase tracking-wider text-stone-300">
            Admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="rounded-xl p-2 text-stone-300 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Left Charcoal Sidebar (Compact zero-scroll container) */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[230px] flex flex-col justify-between bg-[#1f1c1d] text-stone-300 transition-transform duration-200 ease-in-out
          lg:static lg:z-auto lg:h-[calc(100vh-1.5rem)] lg:translate-x-0 lg:sticky lg:top-3 shrink-0 rounded-2xl lg:rounded-3xl border border-stone-800/90 shadow-lg select-none overflow-hidden
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-md'}
        `}
      >
        {/* Zone 1: Pinned Brand Header with Alerts Bell beside Mai Elbadawy */}
        <div className="shrink-0 px-3.5 py-3.5 border-b border-stone-800/80">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              className="group flex flex-col text-left min-w-0"
              title="Go to website"
            >
              <div className="inline-flex items-center gap-1">
                <span className="font-serif text-lg tracking-tight text-white leading-tight group-hover:text-sage transition-colors truncate">
                  Mai <span className="text-sage font-normal group-hover:text-white transition-colors">Elbadawy</span>
                </span>
                <ArrowUpRight className="h-3 w-3 text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="mt-0.5 flex items-center">
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-stone-400 group-hover:bg-sage/20 group-hover:text-sage transition-colors">
                  Admin Dashboard
                </span>
              </div>
            </Link>

            {/* Alerts Bell beside Mai Elbadawy */}
            <div className="relative shrink-0">
              <Link
                to="/admin/messages"
                className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white transition border border-stone-800/80"
                title={notificationCount > 0 ? `${notificationCount} unread alerts` : 'Alerts'}
                aria-label="Alerts"
              >
                <Bell className="h-4 w-4 text-stone-300" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black ring-2 ring-[#1f1c1d]">
                    {notificationCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Menu (Fits comfortably without scrolling) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3.5">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <p className="px-2.5 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, badge }) => {
                  const isActive = pathname === to || (to !== '/admin' && pathname.startsWith(`${to}/`));
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors ${
                        isActive
                          ? 'bg-sage/20 text-sage font-medium shadow-xs border border-sage/30'
                          : 'text-stone-300 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-sage' : 'text-stone-400'}`} />
                      <span className="truncate">{label}</span>
                      {badge && (
                        <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Zone 3: Pinned Bottom Controls (User Profile & Sign Out) */}
        <div className="shrink-0 p-3 border-t border-stone-800/80 bg-[#191718]/90">
          <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/5 border border-white/5">
            <div className="min-w-0 pr-2">
              <p className="truncate text-xs font-medium text-stone-100">
                {profile?.full_name?.split(' ')[0] ?? 'Mai'}
              </p>
              <p className="text-[11px] text-stone-400 capitalize">{profile?.role ?? 'Admin'}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-white/10 transition-colors rounded-lg"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Bar */}
        <header className="sticky top-0 z-20 border border-beige/80 rounded-2xl lg:rounded-3xl bg-white/85 backdrop-blur-md px-5 py-2.5 sm:px-6 sm:py-3 shadow-xs shrink-0">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between max-w-[1440px] mx-auto w-full">
            <div>
              {typeof title === 'string' ? (
                <h1 className="font-serif text-2xl sm:text-3xl text-charcoal tracking-tight font-normal">
                  {title}
                </h1>
              ) : (
                title
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs sm:text-sm text-warm-gray leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {action}
            </div>
          </div>

          {headerContent && (
            <div className="mt-2.5 pt-2 border-t border-beige/60 max-w-[1440px] mx-auto w-full">
              {headerContent}
            </div>
          )}
        </header>

        {/* Page Content Body */}
        <main className="flex-1 pt-2.5 pb-2.5 px-1 sm:px-3 max-w-[1440px] w-full mx-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
