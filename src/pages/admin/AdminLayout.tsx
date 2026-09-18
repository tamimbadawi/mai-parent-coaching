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
  Bell,
  ArrowUpRight,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const AdminLayout = ({ children, title, subtitle, action }: AdminLayoutProps): JSX.Element => {
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
    window.location.href = '/auth/login';
  };

  const navGroups: NavGroup[] = [
    {
      group: 'Practice',
      items: [
        { to: '/admin', label: 'Overview', icon: LayoutDashboard },
        { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
        { to: '/admin/users', label: 'Clients & Users', icon: Users },
        { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
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

      {/* Left Charcoal Sidebar (Rounded container, larger fonts, internal scroll) */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[235px] flex flex-col justify-between bg-[#1f1c1d] text-stone-300 transition-transform duration-200 ease-in-out
          lg:static lg:z-auto lg:h-[calc(100vh-1.5rem)] lg:translate-x-0 lg:sticky lg:top-3 shrink-0 rounded-2xl lg:rounded-3xl border border-stone-800/90 shadow-lg select-none overflow-hidden
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-md'}
        `}
      >
        {/* Zone 1: Pinned Brand Header */}
        <div className="shrink-0 px-5 pt-6 pb-5 border-b border-stone-800/80">
          <Link to="/admin" className="block group">
            <span className="font-serif text-2xl tracking-tight text-white block leading-snug">
              Mai <span className="text-sage font-normal">Elbadawy</span>
            </span>
            <p className="mt-1 text-xs tracking-wider uppercase text-stone-400 font-sans font-medium">
              Parent Coaching
            </p>
          </Link>
        </div>

        {/* Zone 2: Scrollable Navigation Menu (Larger fonts, comfortable tap targets) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-5 space-y-6">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1.5">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon }) => {
                  const isActive = pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-sage/20 text-sage font-medium shadow-xs border border-sage/30'
                          : 'text-stone-300 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-sage' : 'text-stone-400'}`} />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Zone 3: Pinned Bottom Controls (Always visible, larger fonts) */}
        <div className="shrink-0 p-3.5 border-t border-stone-800/80 bg-[#191718]/90 space-y-2 text-sm">
          <Link
            to="/"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-stone-300 hover:bg-white/8 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2.5 font-medium">
              <ExternalLink className="h-4 w-4 text-stone-400" />
              <span>Live Website</span>
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-stone-500" />
          </Link>

          <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/5 border border-white/5">
            <div className="min-w-0 pr-2">
              <p className="truncate text-sm font-medium text-stone-100">
                {profile?.full_name?.split(' ')[0] ?? 'Mai'}
              </p>
              <p className="text-xs text-stone-400 capitalize">{profile?.role ?? 'Admin'}</p>
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
        <header className="sticky top-0 z-20 border border-beige/80 rounded-2xl lg:rounded-3xl bg-white/85 backdrop-blur-md px-5 py-4 sm:px-8 sm:py-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-[1440px] mx-auto w-full">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-charcoal tracking-tight font-normal">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 text-xs sm:text-sm text-warm-gray leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {action}
              {notificationCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-full border border-beige bg-cream px-3.5 py-1.5 text-xs font-medium text-warm-gray">
                  <Bell className="h-3.5 w-3.5 text-sage-dark" />
                  <span>{notificationCount} alerts</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 pt-5 pb-8 px-1 sm:px-4 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
