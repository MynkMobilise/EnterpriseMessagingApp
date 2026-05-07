import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../../utils/api';

/**
 * Landing route for partner-portal SSO redirects.
 *
 * Partner generates a JWT signed with the org's sso_secret, then redirects to:
 *   https://<this-app>/sso?org=<slug>&token=<jwt>
 *
 * We POST { orgSlug, token } to /api/v1/auth/sso/exchange. On success, tokens
 * land in localStorage (handled by apiService) and we redirect to /home. On
 * failure we show the error and a "back to login" link.
 */
export function SsoExchange() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const token = params.get('token');
  const orgSlug = params.get('org') || params.get('orgSlug');

  useEffect(() => {
    if (!token || !orgSlug) {
      setError('Missing token or org parameter — link is malformed.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await apiService.auth.ssoExchange({ orgSlug, token });
        if (cancelled) return;
        if (r?.success) {
          navigate('/home', { replace: true });
        } else {
          setError(r?.error?.message || 'SSO exchange failed.');
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e.response?.data?.error?.message || e.message || 'SSO exchange failed.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, orgSlug, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        {!error ? (
          <>
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Signing you in…</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Verifying SSO token from partner portal
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">SSO sign-in failed</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
