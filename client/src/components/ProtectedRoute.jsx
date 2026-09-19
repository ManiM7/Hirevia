import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * Guards a route subtree. Enforces, in order:
 *  1. must be authenticated
 *  2. if a temporary password hasn't been changed yet, force /change-password
 *  3. if `roles` is given, the user's role must be included
 */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-shell">
        <Spinner dark size={28} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.temporaryPassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // An authenticated user landing on a route meant for a different role
    // (e.g. a stale post-login redirect target from an earlier visit to a
    // different role's page) should go to their own dashboard — never to
    // the public home page, which reads as "login failed."
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return <Outlet />;
}
