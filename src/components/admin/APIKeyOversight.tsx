import { useState } from 'react';
import { Key, Eye, EyeOff, Copy, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function APIKeyOversight() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());

  const apiKeys = [
    {
      id: 1,
      name: 'Production API Key',
      key: 'sk_live_abc123xyz789...', 
      tenant: 'Acme Corporation',
      permissions: ['send_messages', 'read_messages', 'manage_templates'],
      createdAt: '2024-01-15',
      lastUsed: '2 minutes ago',
      requests: 145230,
      status: 'active',
    },
    {
      id: 2,
      name: 'Development Key',
      key: 'sk_test_dev456...',
      tenant: 'Acme Corporation',
      permissions: ['send_messages', 'read_messages'],
      createdAt: '2024-02-10',
      lastUsed: '1 hour ago',
      requests: 8420,
      status: 'active',
    },
    {
      id: 3,
      name: 'Webhook Integration',
      key: 'sk_live_webhook789...',
      tenant: 'TechStart Inc',
      permissions: ['read_messages', 'webhook_access'],
      createdAt: '2024-01-20',
      lastUsed: '15 minutes ago',
      requests: 67800,
      status: 'active',
    },
    {
      id: 4,
      name: 'Legacy Key',
      key: 'sk_live_old123...',
      tenant: 'Global Retail Co',
      permissions: ['send_messages'],
      createdAt: '2023-11-05',
      lastUsed: '30 days ago',
      requests: 12450,
      status: 'revoked',
    },
  ];

  const toggleKeyVisibility = (id: number) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-slate-900 dark:text-white">API Key Oversight</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Generate API Key
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Manage API keys, permissions, and access controls for all tenants
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total API Keys</p>
          <p className="text-3xl text-slate-900 dark:text-white">34</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Active Keys</p>
          <p className="text-3xl text-green-600">30</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Revoked Keys</p>
          <p className="text-3xl text-red-600">4</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total Requests</p>
          <p className="text-3xl text-slate-900 dark:text-white">234K</p>
        </div>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <div
            key={apiKey.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-gray-900/50 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 dark:text-white">{apiKey.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{apiKey.tenant}</p>
                  </div>
                  {apiKey.status === 'active' ? (
                    <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full">
                      Revoked
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* API Key Display */}
            <div className="mb-4 p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-slate-900 dark:text-white">
                  {visibleKeys.has(apiKey.id) ? apiKey.key : '••••••••••••••••••••'}
                </code>
                <button
                  onClick={() => toggleKeyVisibility(apiKey.id)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title={visibleKeys.has(apiKey.id) ? 'Hide' : 'Show'}
                >
                  {visibleKeys.has(apiKey.id) ? (
                    <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  )}
                </button>
                <button
                  onClick={() => copyToClipboard(apiKey.key)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div className="mb-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Permissions:</p>
              <div className="flex flex-wrap gap-2">
                {apiKey.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Created</p>
                <p className="text-slate-900 dark:text-white">{apiKey.createdAt}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Last Used</p>
                <p className="text-slate-900 dark:text-white">{apiKey.lastUsed}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Requests</p>
                <p className="text-slate-900 dark:text-white">{apiKey.requests.toLocaleString()}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-gray-800">
              <button className="px-4 py-2 text-sm bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors">
                Edit Permissions
              </button>
              {apiKey.status === 'active' && (
                <button className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Revoke Key
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Security Warning */}
      <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div>
            <h3 className="text-yellow-900 dark:text-yellow-200 mb-2">Security Best Practices</h3>
            <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
              <li>• Never share API keys in public repositories or client-side code</li>
              <li>• Rotate API keys regularly (recommended: every 90 days)</li>
              <li>• Use separate keys for development, staging, and production environments</li>
              <li>• Immediately revoke any keys that may have been compromised</li>
              <li>• Grant only the minimum required permissions (principle of least privilege)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-gray-800">
              <h2 className="text-xl text-slate-900 dark:text-white mb-1">Generate New API Key</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create a new API key with specific permissions
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Key Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Production API Key"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Tenant <span className="text-red-500">*</span>
                </label>
                <select className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                  <option>Select tenant...</option>
                  <option>Acme Corporation</option>
                  <option>TechStart Inc</option>
                  <option>FinServe Solutions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
                  Permissions <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {['send_messages', 'read_messages', 'manage_templates', 'webhook_access', 'admin_access'].map((perm) => (
                    <label key={perm} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Environment
                </label>
                <select className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Development</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Generate Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
