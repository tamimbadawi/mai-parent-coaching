import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRole?: 'student' | 'admin';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps): JSX.Element => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - loading:', loading, 'user:', !!user, 'profile:', profile, 'requiredRole:', requiredRole);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to login');
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  if (profile && profile.role !== 'admin' && profile.approval_status !== 'approved') {
    console.log('ProtectedRoute - User not approved, redirecting to pending-approval');
    return <Navigate to="/auth/pending-approval" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole === 'admin' && profile?.role !== 'admin') {
    console.log('ProtectedRoute - Not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  console.log('ProtectedRoute - Rendering children');
  return children;
};

export default ProtectedRoute;
