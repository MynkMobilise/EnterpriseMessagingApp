import { useState } from 'react';
import { Search, Plus, MoreVertical, CheckCircle2, XCircle, Settings, Eye, X } from 'lucide-react';

export function TenantManagement() {
  const [showCreateSlideOver, setShowCreateSlideOver] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const tenants = [
    {
      id: 1,
      name: 'Acme Corporation',
      slug: 'acme-corp',
      status: 'active',
      plan: 'Enterprise',
      messagesUsed: 45230,
      messagesLimit: 100000,
      apiKeys: 3,
      templates: 12,
      wabaConnected: true,
      createdAt: '2024-01-15',
      lastActive: '2 hours ago',
    },
    {
      id: 2,
      name: 'TechStart Inc',
      slug: 'techstart-inc',
      status: 'active',
      plan: 'Professional',
      messagesUsed: 18450,
      messagesLimit: 50000,
      apiKeys: 2,
      templates: 8,
      wabaConnected: true,
      createdAt: '2024-02-10',
      lastActive: '15 min ago',
    },
    {
      id: 3,
      name: 'Global Retail Co',
      slug: 'global-retail',
      status: 'inactive',
      plan: 'Enterprise',
      messagesUsed: 92100,
      messagesLimit: 100000,
      apiKeys: 5,
      templates: 24,
      wabaConnected: false,
      createdAt: '2023-11-20',
      lastActive: '3 days ago',
    },
    {
      id: 4,
      name: 'FinServe Solutions',
      slug: 'finserve',
      status: 'active',
      plan: 'Enterprise',
      messagesUsed: 67800,
      messagesLimit: 100000,
      apiKeys: 4,
      templates: 18,
      wabaConnected: true,
      createdAt: '2024-01-05',
      lastActive: '1 hour ago',
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-slate-900 dark:text-white">Tenant Management</h1>
          <button
            onClick={() => setShowCreateSlideOver(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Create Tenant
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Manage all tenant accounts, configurations, and access controls
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total Tenants</p>
          <p className="text-3xl text-slate-900 dark:text-white">247</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Active Tenants</p>
          <p className="text-3xl text-green-600">231</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Inactive Tenants</p>
          <p className="text-3xl text-slate-600 dark:text-slate-400">16</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Enterprise Plans</p>
          <p className="text-3xl text-blue-600">89</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenants by name, slug, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <select className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300">
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <select className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300">
            <option>All Plans</option>
            <option>Enterprise</option>
            <option>Professional</option>
            <option>Starter</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Message Usage
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Resources
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Last Active
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
            {tenants.map((tenant) => {
              const usagePercent = (tenant.messagesUsed / tenant.messagesLimit) * 100;
              return (
                <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-slate-900 dark:text-white">{tenant.name}</p>
                      <p className="text-xs text-slate-500">@{tenant.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {tenant.status === 'active' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-500">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {tenant.messagesUsed.toLocaleString()} / {tenant.messagesLimit.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500">{usagePercent.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            usagePercent > 90
                              ? 'bg-red-500'
                              : usagePercent > 75
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span>{tenant.apiKeys} Keys</span>
                      <span>•</span>
                      <span>{tenant.templates} Templates</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{tenant.lastActive}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTenant(tenant.id)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>
                      <button
                        className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Settings"
                      >
                        <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>
                      <button
                        className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="More Options"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Tenant Slide-Over */}
      {showCreateSlideOver && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateSlideOver(false)}></div>
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl text-slate-900 dark:text-white">Create New Tenant</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Configure tenant profile and initial settings
                </p>
              </div>
              <button
                onClick={() => setShowCreateSlideOver(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tenant Information */}
              <div>
                <h3 className="text-sm text-slate-900 dark:text-white mb-4">Tenant Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                      Tenant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Acme Corporation"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                      Tenant Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., acme-corp"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1">Unique identifier for API endpoints</p>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
                    <input
                      type="email"
                      placeholder="admin@company.com"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <h3 className="text-sm text-slate-900 dark:text-white mb-4">Plan & Quotas</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Plan Type</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                      <option>Starter</option>
                      <option>Professional</option>
                      <option>Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                      Daily Message Limit
                    </label>
                    <input
                      type="number"
                      placeholder="100000"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                      Rate Limit (per minute)
                    </label>
                    <input
                      type="number"
                      placeholder="1000"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Webhook Configuration */}
              <div>
                <h3 className="text-sm text-slate-900 dark:text-white mb-4">Webhook Configuration</h3>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Webhook URL</label>
                  <input
                    type="url"
                    placeholder="https://your-domain.com/webhooks/whatsapp"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-gray-800">
                <button
                  onClick={() => setShowCreateSlideOver(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowCreateSlideOver(false);
                    // Show success notification
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Create Tenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
