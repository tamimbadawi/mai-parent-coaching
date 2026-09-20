import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRole?: 'student' | 'admin';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps): JSX.Element => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole === 'admin' && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  if (!requiredRole && profile?.role === 'admin' && location.pathname.startsWith('/dashboard')) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
