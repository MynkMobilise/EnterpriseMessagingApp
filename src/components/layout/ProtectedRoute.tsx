import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiService } from '../../utils/api';

/**
 * Auth gate for protected sections of the app.
 *
 * - Reads localStorage for a token (the api layer already attaches it as Bearer).
 * - On mount, validates the token via /auth/me. If invalid → redirect to /login
 *   with `state.from` so we can bounce back after re-login.
 * - While validating, shows a lightweight loading state (avoids flashing the
 *   protected UI before we know if the session is good).
 *
 * Children render via <Outlet /> — used as a layout-route element.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'ok' | 'unauthenticated'>(
    () => (localStorage.getItem('accessToken') ? 'checking' : 'unauthenticated')
  );

  useEffect(() => {
    if (status !== 'checking') return;
    let cancelled = false;
    (async () => {
      try {
        const r = await apiService.auth.getCurrentUser();
        if (cancelled) return;
        if (r?.success) {
          setStatus('ok');
        } else {
          localStorage.removeItem('accessToken');
          setStatus('unauthenticated');
        }
      } catch {
        if (cancelled) return;
        localStorage.removeItem('accessToken');
        setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Restoring session…</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
