import { useState } from 'react';
import { Plus, Link, Unlink, AlertTriangle, CheckCircle2, Key, Settings } from 'lucide-react';

export function MetaWhatsAppAccounts() {
  const [showAddModal, setShowAddModal] = useState(false);

  const accounts = [
    {
      id: 1,
      wabaId: 'WABA-1234567890',
      businessName: 'Acme Corporation',
      phoneNumbers: 3,
      status: 'connected',
      environment: 'production',
      tokenExpiry: '2025-06-15',
      lastSync: '2 minutes ago',
      tenant: 'Acme Corporation',
    },
    {
      id: 2,
      wabaId: 'WABA-0987654321',
      businessName: 'TechStart Inc',
      phoneNumbers: 2,
      status: 'connected',
      environment: 'production',
      tokenExpiry: '2025-08-20',
      lastSync: '15 minutes ago',
      tenant: 'TechStart Inc',
    },
    {
      id: 3,
      wabaId: 'WABA-5555555555',
      businessName: 'FinServe Solutions',
      phoneNumbers: 4,
      status: 'error',
      environment: 'production',
      tokenExpiry: '2024-03-10',
      lastSync: 'Failed',
      tenant: 'FinServe Solutions',
    },
    {
      id: 4,
      wabaId: 'WABA-TEST-999',
      businessName: 'Test Account',
      phoneNumbers: 1,
      status: 'connected',
      environment: 'sandbox',
      tokenExpiry: '2025-12-31',
      lastSync: '1 hour ago',
      tenant: 'Test Environment',
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-slate-900 dark:text-white">Meta WhatsApp Business Accounts</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Add WABA Account
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Manage WhatsApp Business API account connections and authentication tokens
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total WABAs</p>
          <p className="text-3xl text-slate-900 dark:text-white">4</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Connected</p>
          <p className="text-3xl text-green-600">3</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Errors</p>
          <p className="text-3xl text-red-600">1</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Phone Numbers</p>
          <p className="text-3xl text-slate-900 dark:text-white">10</p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-6">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-gray-900/50 transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-slate-900 dark:text-white">{account.businessName}</h3>
                  {account.status === 'connected' ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      Error
                    </div>
                  )}
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      account.environment === 'production'
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {account.environment}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  WABA ID: <code className="px-2 py-1 bg-slate-100 dark:bg-gray-800 rounded text-xs">{account.wabaId}</code>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Token Management">
                  <Key className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Settings">
                  <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Tenant</p>
                <p className="text-sm text-slate-900 dark:text-white">{account.tenant}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Phone Numbers</p>
                <p className="text-sm text-slate-900 dark:text-white">{account.phoneNumbers} connected</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Token Expiry</p>
                <p className={`text-sm ${
                  new Date(account.tokenExpiry) < new Date()
                    ? 'text-red-600'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {account.tokenExpiry}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Last Sync</p>
                <p className="text-sm text-slate-900 dark:text-white">{account.lastSync}</p>
              </div>
            </div>

            {account.status === 'error' && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-900 dark:text-red-200 mb-1">
                      Authentication Token Expired
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      The access token for this WABA has expired. Please refresh the token to restore connectivity.
                    </p>
                  </div>
                  <button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors">
                    Refresh Token
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add WABA Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-gray-800">
              <h2 className="text-xl text-slate-900 dark:text-white mb-1">Add WhatsApp Business Account</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Connect a new WABA to the platform
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Tenant <span className="text-red-500">*</span>
                </label>
                <select className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                  <option>Select tenant...</option>
                  <option>Acme Corporation</option>
                  <option>TechStart Inc</option>
                  <option>FinServe Solutions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  WABA ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter WhatsApp Business Account ID"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Found in your Meta Business Manager</p>
              </div>

              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Access Token <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter permanent access token from Meta"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Generate a system user token with never-expiring permissions</p>
              </div>

              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Environment <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="environment"
                      value="production"
                      defaultChecked
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Production</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="environment"
                      value="sandbox"
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Sandbox</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Note:</strong> Ensure the access token has the following permissions: 
                  whatsapp_business_management, whatsapp_business_messaging
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Connect WABA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
