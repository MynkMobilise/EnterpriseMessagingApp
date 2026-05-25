/**
 * Webhook Events — operator-facing diagnostic of Meta's webhook delivery.
 *
 * Polls /api/v1/webhooks/recent every 5s. Shows incoming `messages`,
 * status updates, and template-status events with the org each row was
 * routed to (or "Unknown org" if Meta delivered for a phone_number_id
 * that no settings row matches — the canonical "why isn't anything
 * arriving" sign).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Inbox,
  RefreshCw,
  Loader2,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';

const POLL_INTERVAL_MS = 5000;

interface WebhookEventRow {
  id: number;
  organizationId: number | null;
  field: string | null;
  direction: 'inbound' | 'status' | 'template_status' | 'unknown';
  status: 'ok' | 'skipped' | 'unknown_org' | 'error';
  summary: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export function WebhookEvents() {
  const [events, setEvents] = useState<WebhookEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const fetchEvents = async () => {
    try {
      const r = await apiService.webhooks.recent({ limit: 100 });
      if (r?.success) {
        setEvents((prev) => {
          // Briefly highlight rows that just arrived (since the previous
          // fetch's max id) so the operator can see live activity even
          // without scrolling.
          const prevMaxId = prev.length > 0 ? prev[0].id : 0;
          const next = r.data || [];
          const newest = next.length > 0 ? next[0].id : 0;
          if (newest > prevMaxId) {
            setHighlightId(newest);
            setTimeout(() => setHighlightId(null), 2500);
          }
          return next;
        });
        setError(null);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) {
        setError('Webhooks API not available — restart the backend to pick up the new route.');
      } else if (status === 401 || status === 403) {
        setError('You don\'t have permission to view webhook events.');
      } else {
        setError(e?.response?.data?.error?.message || e?.message || 'Failed to load events');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    if (!autoRefresh) return;
    const id = setInterval(fetchEvents, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const stats = useMemo(() => ({
    total: events.length,
    ok: events.filter((e) => e.status === 'ok').length,
    unknownOrg: events.filter((e) => e.status === 'unknown_org').length,
    error: events.filter((e) => e.status === 'error').length,
  }), [events]);

  return (
    <div className="colorful p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Webhook Events</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Live feed of webhook deliveries from Meta. Auto-refreshes every 5 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            Auto-refresh
          </label>
          <button
            onClick={() => {
              setLoading(true);
              fetchEvents();
            }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total (last 100)" value={stats.total} icon={<Activity className="w-5 h-5" />} color="blue" />
        <Stat label="Persisted OK" value={stats.ok} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
        <Stat label="Unknown Org" value={stats.unknownOrg} icon={<AlertTriangle className="w-5 h-5" />} color="yellow" />
        <Stat label="Errored" value={stats.error} icon={<XCircle className="w-5 h-5" />} color="red" />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
          ⚠ {error}
        </div>
      )}

      {/* Empty / loading / list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              No webhook events yet. After Meta starts delivering (callback URL verified
              + <code>messages</code> field subscribed), every event will appear here within seconds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Direction</th>
                  <th className="text-left px-4 py-3">Field</th>
                  <th className="text-left px-4 py-3">Org</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
                      highlightId === e.id
                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {formatTime(e.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <DirectionBadge dir={e.direction} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {e.field || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {e.organizationId == null ? <em>none</em> : `#${e.organizationId}`}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <div className="truncate max-w-md" title={e.summary || ''}>
                        {e.summary || '—'}
                      </div>
                      {e.errorMessage && (
                        <div className="text-xs text-red-600 dark:text-red-400 truncate max-w-md" title={e.errorMessage}>
                          {e.errorMessage}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diagnostic hints when unknown_org events are showing up */}
      {stats.unknownOrg > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
              <p className="font-medium">Some events are arriving but no org owns them.</p>
              <p>
                Meta is delivering for a <code>phone_number_id</code> that doesn't match any
                <code> organization_settings.whatsapp_phone_number_id</code> in your DB. Open Settings →
                WhatsApp → Manual Configuration and confirm the saved Phone Number ID matches the one
                Meta is sending from.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label, value, icon, color,
}: { label: string; value: number; icon: React.ReactNode; color: 'blue' | 'green' | 'yellow' | 'red' }) {
  const cls = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    yellow: 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  }[color];
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl text-gray-900 dark:text-white mt-1">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${cls}`}>{icon}</div>
    </div>
  );
}

function DirectionBadge({ dir }: { dir: WebhookEventRow['direction'] }) {
  const cfg: Record<WebhookEventRow['direction'], { label: string; cls: string }> = {
    inbound: { label: 'Inbound', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    status: { label: 'Status', cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
    template_status: { label: 'Template', cls: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
    unknown: { label: 'Unknown', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
  };
  const c = cfg[dir];
  return <span className={`px-2 py-0.5 text-xs rounded-full ${c.cls}`}>{c.label}</span>;
}

function StatusBadge({ status }: { status: WebhookEventRow['status'] }) {
  const cfg: Record<WebhookEventRow['status'], { label: string; cls: string }> = {
    ok: { label: 'OK', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    skipped: { label: 'Skipped', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
    unknown_org: { label: 'Unknown Org', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
    error: { label: 'Error', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  };
  const c = cfg[status];
  return <span className={`px-2 py-0.5 text-xs rounded-full ${c.cls}`}>{c.label}</span>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return d.toLocaleString();
}
