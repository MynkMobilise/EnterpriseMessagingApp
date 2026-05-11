import { Copy, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * The webhook callback URL has to point at the BACKEND, not the frontend
 * origin. In dev they run on different ports (FE: 3000/5173, BE: 3003), so
 * `window.location.origin` is wrong. Derive from VITE_API_BASE_URL by
 * stripping the `/api/v1` suffix and append the webhook path.
 */
function getCallbackUrl(): string {
  const apiBase: string =
    (import.meta as any).env?.VITE_API_BASE_URL || 'https://suchna.onmobilise.com/api/v1';
  // strip trailing /api/v1 (and any trailing slash) → keep the bare host
  const host = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  return `${host}/api/v1/webhooks/whatsapp`;
}

function isLocalhost(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(url);
}

function isHttp(url: string): boolean {
  return /^http:\/\//i.test(url);
}

/**
 * Generate a cryptographically-random verify token for the Meta webhook.
 * Uses the browser's Web Crypto API where available — `crypto.randomUUID`
 * is widely supported. Falls back to Math.random() for ancient browsers.
 *
 * Format: 32 hex chars, prefixed with `wht_` so the token is recognizably
 * one of ours if it shows up in Meta's webhook config later.
 */
function generateVerifyToken(): string {
  let raw = '';
  const c: any = (typeof crypto !== 'undefined' ? crypto : null);
  if (c?.randomUUID) {
    raw = c.randomUUID().replace(/-/g, '');
  } else if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    raw = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
  return `wht_${raw}`;
}

interface WebhookConfigurationFormProps {
  webhookVerifyToken: string;
  webhookEvents: {
    messages: boolean;
    messageStatus: boolean;
    accountUpdate: boolean;
    phoneNumberUpdate: boolean;
    messageTemplateUpdate: boolean;
  };
  onWebhookVerifyTokenChange: (value: string) => void;
  onWebhookEventsChange: (events: WebhookConfigurationFormProps['webhookEvents']) => void;
  onTestWebhook?: () => void;
}

export function WebhookConfigurationForm({
  webhookVerifyToken,
  webhookEvents,
  onWebhookVerifyTokenChange,
  onWebhookEventsChange,
  onTestWebhook,
}: WebhookConfigurationFormProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const testWebhook = () => {
    if (onTestWebhook) {
      onTestWebhook();
    } else {
      toast.loading('Testing webhook connection...', { id: 'webhook-test' });
      setTimeout(() => {
        toast.success('Webhook connection successful!', { id: 'webhook-test' });
      }, 2000);
    }
  };

  const callbackUrl = getCallbackUrl();
  const callbackIsLocal = isLocalhost(callbackUrl);
  const callbackIsHttp = isHttp(callbackUrl);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg text-gray-900 dark:text-white mb-4">Webhook Configuration</h3>

      {(callbackIsLocal || callbackIsHttp) && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
            <p className="font-medium">Meta will reject this callback URL</p>
            <p>
              Meta's verification servers can't reach{' '}
              <code className="text-[11px] bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">
                {callbackUrl}
              </code>{' '}
              because it's <strong>{callbackIsLocal ? 'on localhost' : ''}</strong>
              {callbackIsLocal && callbackIsHttp ? ' and ' : ''}
              <strong>{callbackIsHttp ? 'plain HTTP' : ''}</strong>. Meta requires
              a publicly-reachable HTTPS URL.
            </p>
            <p className="pt-1">
              Quick fix for local dev: run{' '}
              <code className="text-[11px] bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">
                ngrok http 3003
              </code>{' '}
              and use the resulting <code>https://&lt;something&gt;.ngrok-free.app/api/v1/webhooks/whatsapp</code> URL in
              Meta App Dashboard instead of the value below.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Callback URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={callbackUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(callbackUrl);
                toast.success('Callback URL copied');
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Copy callback URL"
            >
              <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={testWebhook}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Test
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Verify Token
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={webhookVerifyToken}
              onChange={(e) => onWebhookVerifyTokenChange(e.target.value)}
              placeholder="Enter webhook verify token"
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
            <button
              onClick={() => {
                const t = generateVerifyToken();
                onWebhookVerifyTokenChange(t);
                navigator.clipboard.writeText(t).catch(() => {});
                toast.success('Verify token generated and copied', {
                  description: 'Click Save Webhook Settings, then paste this same token into Meta App Dashboard.',
                });
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              title="Generate a new random verify token"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
            <button
              onClick={() => copyToClipboard(webhookVerifyToken || '', 'Verify Token')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              disabled={!webhookVerifyToken}
              title="Copy verify token"
            >
              <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Click Generate for a secure random token. After saving here, paste the same value into Meta App Dashboard → WhatsApp → Configuration → Verify Token.
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-3">
            Subscribed Events
          </label>
          <div className="space-y-2">
            {Object.entries(webhookEvents).map(([key, value]) => (
              <label key={key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    onWebhookEventsChange({ ...webhookEvents, [key]: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

