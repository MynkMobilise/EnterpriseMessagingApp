import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { PermissionKey, Role, useAuth } from '../../contexts/AuthContext';

interface Props {
  /** Permission(s) required to render the route. If multiple, the user needs ANY. */
  anyOf?: PermissionKey[];
  /** Role(s) required to render the route. */
  role?: Role | Role[];
  /** Path to send unauthorized users to (default `/home`). */
  redirectTo?: string;
  /** When true, show a 403 panel instead of redirecting. */
  showDenied?: boolean;
  children: ReactNode;
}

/**
 * Gate a route by permission/role. Used inline in App.tsx alongside <Route>.
 * Defers rendering until the AuthContext finishes its initial /auth/me fetch
 * so we never flash-redirect a user who is actually entitled to the page.
 */
export function RequirePermission({
  anyOf,
  role,
  redirectTo = '/home',
  showDenied = false,
  children,
}: Props) {
  const { user, loading, hasPermission, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-500">
        Checking permissions…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // super_admin bypass — handled inside hasPermission/hasRole as well.
  const permOk = !anyOf || anyOf.length === 0 || anyOf.some((p) => hasPermission(p));
  const rolesArr = role ? (Array.isArray(role) ? role : [role]) : null;
  const roleOk = !rolesArr || hasRole(...rolesArr);

  if (permOk && roleOk) return <>{children}</>;

  if (showDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <ShieldOff className="w-6 h-6 text-gray-500" />
          </div>
          <h2 className="text-base text-gray-900 dark:text-white">Access denied</h2>
          <p className="text-sm text-gray-500">
            You don't have permission to view this page. Ask an administrator to grant
            access or assign you a role with the required capability.
          </p>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectTo} replace />;
}
