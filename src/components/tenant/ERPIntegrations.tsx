/**
 * Integrations page — manage external API keys.
 *
 * An "integration" here is just an API key plus its metadata. The same key
 * authenticates calls to `POST /api/v1/integrations/messages` from external
 * systems (HRMS, CRM, ...). On creation the raw key is shown once (only once
 * — the backend stores SHA-256 of it) and copy + sample-code helpers make
 * it easy to drop into the customer's app.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  CheckCircle,
  Activity,
  Settings as SettingsIcon,
  Copy,
  AlertCircle,
  X,
  Loader2,
  Code,
  Eye,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';

interface ApiKeyRow {
  id: number;
  name: string;
  description?: string | null;
  environment: 'production' | 'staging' | 'development';
  status: 'active' | 'inactive' | 'revoked';
  keyPrefix: string;
  keyHint: string;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  totalRequests: number;
  lastUsedAt?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

const API_BASE_FOR_DOCS =
  ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3003/api/v1').replace(/\/+$/, '');

export function ERPIntegrations() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'revoked'>('all');
  const [filterEnv, setFilterEnv] = useState<'all' | 'production' | 'staging' | 'development'>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [showCreated, setShowCreated] = useState<{ key: string; row: ApiKeyRow } | null>(null);

  const fetchKeys = async () => {
    try {
      const r = await apiService.apiKeys.list();
      if (r?.success) setKeys(r.data || []);
    } catch (e: any) {
      toast.error('Failed to load integrations', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return keys.filter((k) => {
      if (filterStatus !== 'all' && k.status !== filterStatus) return false;
      if (filterEnv !== 'all' && k.environment !== filterEnv) return false;
      if (q && !`${k.name} ${k.description || ''} ${k.environment}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [keys, searchQuery, filterStatus, filterEnv]);

  const stats = useMemo(() => ({
    total: keys.length,
    active: keys.filter((k) => k.status === 'active').length,
    inactive: keys.filter((k) => k.status === 'inactive').length,
    revoked: keys.filter((k) => k.status === 'revoked').length,
  }), [keys]);

  const handleRevoke = async (row: ApiKeyRow) => {
    const ok = window.confirm(
      `Revoke "${row.name}"? Any external system using this key will immediately stop working.`
    );
    if (!ok) return;
    try {
      const r = await apiService.apiKeys.revoke(String(row.id), 'Revoked from Integrations page');
      if (r?.success) {
        toast.success(`Revoked ${row.name}`);
        fetchKeys();
      } else {
        toast.error('Revoke failed', { description: r?.error?.message });
      }
    } catch (e: any) {
      toast.error('Revoke failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate API keys and let external systems send messages on your org's behalf.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 shadow"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} icon={<SettingsIcon className="w-5 h-5" />} color="blue" />
        <StatCard label="Active" value={stats.active} icon={<CheckCircle className="w-5 h-5" />} color="green" />
        <StatCard label="Inactive" value={stats.inactive} icon={<Activity className="w-5 h-5" />} color="gray" />
        <StatCard label="Revoked" value={stats.revoked} icon={<AlertCircle className="w-5 h-5" />} color="red" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, description, environment…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterEnv}
          onChange={(e) => setFilterEnv(e.target.value as any)}
          className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
        >
          <option value="all">All Environments</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Integration</th>
                <th className="text-left px-4 py-3">Environment</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Key Hint</th>
                <th className="text-left px-4 py-3">Total Requests</th>
                <th className="text-left px-4 py-3">Last Used</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <SettingsIcon className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                    {keys.length === 0
                      ? 'No integrations yet. Click Add Integration to generate an API key.'
                      : 'No integrations match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((k) => (
                  <tr key={k.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-white">{k.name}</div>
                      {k.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{k.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 capitalize">
                        {k.environment}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={k.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {k.keyPrefix}…{k.keyHint}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{k.totalRequests || 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {k.status !== 'revoked' && (
                        <button
                          onClick={() => handleRevoke(k)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Revoke this key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateIntegrationModal
          onClose={() => setShowCreate(false)}
          onCreated={(rawKey, row) => {
            setShowCreate(false);
            setShowCreated({ key: rawKey, row });
            fetchKeys();
          }}
        />
      )}

      {showCreated && (
        <KeyCreatedModal
          rawKey={showCreated.key}
          row={showCreated.row}
          onClose={() => setShowCreated(null)}
        />
      )}
    </div>
  );
}

/* --------------------------- Create modal -------------------------------- */

function CreateIntegrationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (rawKey: string, row: ApiKeyRow) => void;
}) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [description, setDescription] = useState('');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [rateLimitPerDay, setRateLimitPerDay] = useState(10000);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for this integration');
      return;
    }
    setSubmitting(true);
    try {
      const r = await apiService.apiKeys.create({
        name: name.trim(),
        environment,
        description: description.trim() || undefined,
        rateLimitPerMinute,
        rateLimitPerDay,
      });
      if (r?.success && r.data?.key) {
        onCreated(r.data.key, r.data.apiKey);
      } else {
        toast.error('Failed to create integration', { description: r?.error?.message });
      }
    } catch (e: any) {
      toast.error('Failed to create integration', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg text-gray-900 dark:text-white">New Integration</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HRMS Production"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">A label so you remember which system uses this key.</p>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Environment</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="production">Production (sk_live_…)</option>
              <option value="staging">Staging (sk_staging_…)</option>
              <option value="development">Development (sk_test_…)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this integration used for?"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Rate / minute</label>
              <input
                type="number"
                min={1}
                value={rateLimitPerMinute}
                onChange={(e) => setRateLimitPerMinute(Number(e.target.value) || 60)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Rate / day</label>
              <input
                type="number"
                min={1}
                value={rateLimitPerDay}
                onChange={(e) => setRateLimitPerDay(Number(e.target.value) || 10000)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate API Key
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Key-just-created modal --------------------------- */

function KeyCreatedModal({
  rawKey,
  row,
  onClose,
}: {
  rawKey: string;
  row: ApiKeyRow;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'curl' | 'node' | 'python'>('curl');

  const sendUrl = `${API_BASE_FOR_DOCS}/integrations/messages`;

  const samples: Record<typeof tab, string> = {
    curl: `curl -X POST ${sendUrl} \\
  -H "X-API-Key: ${rawKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "whatsapp",
    "to": "+919999999999",
    "templateName": "greetings",
    "variables": { "1": "Mayank" }
  }'`,
    node: `const axios = require('axios');

await axios.post(
  '${sendUrl}',
  {
    channel: 'whatsapp',
    to: '+919999999999',
    templateName: 'greetings',
    variables: { 1: 'Mayank' },
  },
  { headers: { 'X-API-Key': '${rawKey}' } }
);`,
    python: `import requests

requests.post(
    '${sendUrl}',
    headers={'X-API-Key': '${rawKey}'},
    json={
        'channel': 'whatsapp',
        'to': '+919999999999',
        'templateName': 'greetings',
        'variables': {'1': 'Mayank'},
    },
)`,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg text-gray-900 dark:text-white">{row.name} created</h3>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Eye className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
                <p className="font-medium">This is the only time you'll see the full key.</p>
                <p>
                  Copy it now and store it somewhere secure. We only keep a hash —
                  if you lose the key you'll have to revoke and create a new one.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">API Key</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={rawKey}
                className="flex-1 px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rawKey);
                  toast.success('API key copied');
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-gray-700 dark:text-gray-300">
                <Code className="w-4 h-4 inline mr-1" />
                Sample request
              </label>
              <div className="flex gap-1">
                {(['curl', 'node', 'python'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-2.5 py-1 text-xs rounded ${
                      tab === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <pre className="p-3 bg-gray-900 text-gray-100 text-xs rounded-lg overflow-x-auto font-mono whitespace-pre">
              {samples[tab]}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(samples[tab]);
                toast.success('Sample copied');
              }}
              className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy sample
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 pt-2 border-t border-gray-200 dark:border-gray-800">
            <p>
              <span className="font-medium">Auth:</span> send the key as{' '}
              <code className="px-1 bg-gray-100 dark:bg-gray-800 rounded">X-API-Key</code> header (or
              <code className="px-1 bg-gray-100 dark:bg-gray-800 rounded ml-1">
                Authorization: Bearer …
              </code>
              ).
            </p>
            <p>
              <span className="font-medium">Rate limits:</span> {row.rateLimitPerMinute}/min ·{' '}
              {row.rateLimitPerDay}/day.
            </p>
            <p>
              <span className="font-medium">Health check:</span>{' '}
              <code className="px-1 bg-gray-100 dark:bg-gray-800 rounded">
                GET {API_BASE_FOR_DOCS}/integrations/whoami
              </code>{' '}
              echoes the org / scopes the key resolves to.
            </p>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            I've saved my key
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------------- */

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'gray' | 'red';
}) {
  const colorClass = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    gray: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  }[color];
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl text-gray-900 dark:text-white mt-1">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ApiKeyRow['status'] }) {
  const cfg = {
    active: { label: 'Active', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    inactive: { label: 'Inactive', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
    revoked: { label: 'Revoked', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  }[status];
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${cfg.cls}`}>{cfg.label}</span>
  );
}
