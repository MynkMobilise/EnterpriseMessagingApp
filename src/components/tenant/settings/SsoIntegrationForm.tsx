import { useEffect, useState } from 'react';
import { Eye, EyeOff, Copy, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../utils/api';

/**
 * SSO Integration panel — surfaces the org's signing secret + sample code so a
 * partner portal (e.g. Sparsh) can generate JWTs that this app trusts.
 *
 * Security notes for the reader:
 *   - The secret is fetched on demand (admin-only) and shown once.
 *   - Rotate Secret immediately invalidates the old one. Partner portals must
 *     be updated in lockstep.
 *   - JIT-provisioned users get the configured `ssoDefaultRole` unless the
 *     partner JWT explicitly sets a `role` claim (capped at the same set).
 */
export function SsoIntegrationForm() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [defaultRole, setDefaultRole] = useState('operator');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orgSlug, setOrgSlug] = useState('your-org-slug');

  // The exchange URL the partner posts to. We compute from window.origin so
  // sample code copies the right host (works for localhost + staging + prod).
  const exchangeUrl = `${window.location.origin}/api/v1/auth/sso/exchange`;
  const ssoEntryUrl = `${window.location.origin}/sso`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ssoR, meR] = await Promise.all([
          apiService.settings.getSso(),
          apiService.auth.getCurrentUser(),
        ]);
        if (cancelled) return;
        if (ssoR?.success && ssoR.data) {
          setEnabled(ssoR.data.ssoEnabled);
          setDefaultRole(ssoR.data.ssoDefaultRole);
          setSecret(ssoR.data.ssoSecret);
        }
        if (meR?.success && meR.data?.organization?.slug) {
          setOrgSlug(meR.data.organization.slug);
        }
      } catch (e: any) {
        toast.error('Failed to load SSO settings', {
          description: e.response?.data?.error?.message || e.message,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await apiService.settings.updateSso({ ssoEnabled: enabled, ssoDefaultRole: defaultRole });
      if (r?.success) toast.success('SSO settings saved');
    } catch (e: any) {
      toast.error('Save failed', { description: e.response?.data?.error?.message || e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async () => {
    if (!confirm('Rotate the SSO secret? Partner portals using the old secret will immediately stop working until you give them the new one.')) return;
    setRotating(true);
    try {
      const r = await apiService.settings.rotateSsoSecret();
      if (r?.success && r.data?.ssoSecret) {
        setSecret(r.data.ssoSecret);
        setShowSecret(true);
        toast.success('Secret rotated. Update your partner portals with the new value.');
      }
    } catch (e: any) {
      toast.error('Rotate failed', { description: e.response?.data?.error?.message || e.message });
    } finally {
      setRotating(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const sampleNode = `// Node.js — generate an SSO token in your partner backend, then redirect the user.
const jwt = require('jsonwebtoken');

const SSO_SECRET = process.env.MESSAGING_SSO_SECRET; // store this server-side ONLY
const ORG_SLUG = '${orgSlug}';

function buildSsoRedirectUrl(user) {
  const token = jwt.sign(
    {
      email: user.email,                 // required
      name: user.fullName || undefined,  // optional — used for first-time provisioning
      role: 'operator',                  // optional — viewer | operator | manager
      exp: Math.floor(Date.now() / 1000) + 300,  // 5 minutes
    },
    SSO_SECRET,
    { algorithm: 'HS256' }
  );
  return \`${ssoEntryUrl}?org=\${ORG_SLUG}&token=\${encodeURIComponent(token)}\`;
}

// In your route:
//   res.redirect(buildSsoRedirectUrl(req.user));`;

  const samplePython = `# Python — same flow, using PyJWT
import jwt, time
from urllib.parse import quote

SSO_SECRET = os.environ['MESSAGING_SSO_SECRET']
ORG_SLUG = '${orgSlug}'

def build_sso_redirect_url(user):
    token = jwt.encode(
        {
            'email': user.email,
            'name': getattr(user, 'full_name', None),
            'role': 'operator',
            'exp': int(time.time()) + 300,
        },
        SSO_SECRET,
        algorithm='HS256',
    )
    return f"${ssoEntryUrl}?org={ORG_SLUG}&token={quote(token)}"`;

  if (loading) {
    return <div className="text-sm text-gray-500">Loading SSO settings…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Tenant SSO
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
              Let an external portal (e.g. an HRIS, intranet, or partner app) sign users into this workspace using a shared secret. Users without an account are auto-provisioned with the default role and emailed a welcome message with their direct-login password — they can then sign in via SSO redirect or directly with email + password.
            </p>
          </div>
          <label className="inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-full" />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Default role for new SSO users
            </label>
            <select
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="viewer">Viewer (read-only)</option>
              <option value="operator">Operator (send messages)</option>
              <option value="manager">Manager (full tenant access)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Used when the SSO token doesn't include a <code>role</code> claim.
            </p>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Signing secret */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Signing secret</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Use this secret in your partner portal to sign SSO JWTs. Treat it like a password — anyone with this value can impersonate any user in this org.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type={showSecret ? 'text' : 'password'}
            value={secret}
            readOnly
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white"
          />
          <button
            onClick={() => setShowSecret(!showSecret)}
            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title={showSecret ? 'Hide' : 'Show'}
          >
            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => copy(secret, 'Secret')}
            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            disabled={rotating}
            className="px-4 py-2 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${rotating ? 'animate-spin' : ''}`} />
            {rotating ? 'Rotating…' : 'Rotate'}
          </button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Rotating immediately invalidates JWTs signed with the old secret. Update your partner portal in lockstep, or users will start getting <em>"Invalid SSO token"</em>.
          </span>
        </div>
      </div>

      {/* Endpoint info */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Integration endpoints</h3>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">Org slug</div>
            <code className="block px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs">{orgSlug}</code>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">SSO entry URL (where to redirect users)</div>
            <code className="block px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs break-all">
              {ssoEntryUrl}?org={orgSlug}&token=&lt;jwt&gt;
            </code>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">Backend exchange endpoint (for programmatic use)</div>
            <code className="block px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs break-all">POST {exchangeUrl}</code>
          </div>
        </div>
      </div>

      {/* Sample code */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sample integration</h3>
        </div>

        <details open className="mb-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
            <span>Node.js (jsonwebtoken)</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                copy(sampleNode, 'Node.js sample');
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Copy
            </button>
          </summary>
          <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">{sampleNode}</pre>
        </details>

        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
            <span>Python (PyJWT)</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                copy(samplePython, 'Python sample');
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Copy
            </button>
          </summary>
          <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">{samplePython}</pre>
        </details>
      </div>
    </div>
  );
}
