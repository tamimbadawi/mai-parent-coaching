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
    navigate('/auth/login');
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
    <div className="min-h-screen bg-[#faf8f4] text-charcoal flex flex-col lg:flex-row antialiased">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile top header bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-beige/60 bg-[#1f1c1d] px-4 py-3 text-white lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <span className="font-serif text-lg tracking-tight text-white">
            Mai <span className="text-sage font-normal">Elbadawy</span>
          </span>
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-stone-300">
            Admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="rounded-lg p-2 text-stone-300 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Left Charcoal Sidebar (Option 1: Studio Rail with fixed 3-zone flex and internal scrolling) */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[215px] flex flex-col justify-between bg-[#1f1c1d] text-stone-300 transition-transform duration-200 ease-in-out
          lg:static lg:z-auto lg:translate-x-0 lg:sticky lg:top-0 shrink-0 border-r border-stone-800/80 select-none
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'}
        `}
      >
        {/* Zone 1: Pinned Brand Header */}
        <div className="shrink-0 px-4 pt-5 pb-4 border-b border-stone-800/80">
          <Link to="/admin" className="block group">
            <span className="font-serif text-xl tracking-tight text-white block leading-snug">
              Mai <span className="text-sage font-normal">Elbadawy</span>
            </span>
            <p className="mt-0.5 text-[10px] tracking-wider uppercase text-stone-400 font-sans">
              Parent Coaching
            </p>
          </Link>
        </div>

        {/* Zone 2: Scrollable Navigation Menu (Eliminates overflow issues on any laptop screen height) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => {
                  const isActive = pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                        isActive
                          ? 'bg-sage/15 text-sage font-medium shadow-xs'
                          : 'text-stone-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-sage' : 'text-stone-400'}`} />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Zone 3: Pinned Bottom Controls (Always visible, never pushed off-screen) */}
        <div className="shrink-0 p-3 border-t border-stone-800/80 bg-[#191718]/80 space-y-1.5 text-xs">
          <Link
            to="/"
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-stone-400 hover:bg-white/5 hover:text-stone-200 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Live Website</span>
            </span>
            <ArrowUpRight className="h-3 w-3 text-stone-500" />
          </Link>

          <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 bg-white/4">
            <div className="min-w-0 pr-2">
              <p className="truncate text-xs font-medium text-stone-200">
                {profile?.full_name?.split(' ')[0] ?? 'Mai'}
              </p>
              <p className="text-[10px] text-stone-500 capitalize">{profile?.role ?? 'Admin'}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1 text-stone-400 hover:text-rose-400 transition-colors rounded"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Sticky Top Bar */}
        <header className="sticky top-0 z-20 border-b border-beige/80 bg-white/80 backdrop-blur-md px-5 py-4 sm:px-8 sm:py-5">
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
                <div className="flex items-center gap-1.5 rounded-full border border-beige bg-cream px-3 py-1.5 text-xs text-warm-gray">
                  <Bell className="h-3.5 w-3.5 text-sage-dark" />
                  <span>{notificationCount} alerts</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
