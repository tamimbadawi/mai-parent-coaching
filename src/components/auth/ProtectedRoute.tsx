import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRole?: 'student' | 'admin';
  redirectTo?: string;
}

const ProtectedRoute = ({ children, requiredRole, redirectTo }: ProtectedRouteProps): JSX.Element => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (user && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo || '/auth/login'} replace state={{ from: location.pathname }} />;
  }

  const isAdmin =
    profile?.role === 'admin' ||
    user.user_metadata?.role === 'admin' ||
    user.app_metadata?.role === 'admin' ||
    user.email?.toLowerCase() === 'tamimbadawi@gmail.com';

  if (!isAdmin) {
    const rawPhone = profile?.phone || user.user_metadata?.phone || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const hasPhone = Boolean(rawPhone && cleanDigits.length >= 7);
    const hasCountry = Boolean(profile?.country || user.user_metadata?.country);

    if (!hasPhone || !hasCountry) {
      return <Navigate to="/auth/complete-profile" replace state={{ from: location.pathname }} />;
    }
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  if (!requiredRole && isAdmin && location.pathname.startsWith('/dashboard')) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
