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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        {/* Sidebar */}
        <aside className="w-full shrink-0 rounded-[24px] border border-beige bg-white p-4 shadow-sm lg:w-64">
          <div className="flex items-center gap-3 rounded-2xl bg-sage/10 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">
                {profile?.full_name?.split(' ')[0] ?? 'Admin'}
              </p>
              <p className="text-xs text-warm-gray">Admin Panel</p>
            </div>
          </div>

          <nav className="mt-6 space-y-1 text-sm">
            {navItems.map(({ to, label, icon: Icon }) => {
              const isActive = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                    isActive
                      ? 'bg-sage/10 text-sage-dark font-medium'
                      : 'text-warm-gray hover:bg-cream'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-warm-gray hover:bg-cream mt-4"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl text-charcoal mb-6">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
