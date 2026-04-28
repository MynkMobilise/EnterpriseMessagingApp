import { useState } from 'react';
import { Gauge, AlertTriangle, TrendingUp, Settings } from 'lucide-react';

export function QuotaRateLimits() {
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);

  const tenants = [
    {
      id: 1,
      name: 'Acme Corporation',
      plan: 'Enterprise',
      dailyQuota: 100000,
      usedToday: 45230,
      rateLimit: 1000,
      currentRate: 420,
      burstLimit: 2000,
      status: 'healthy',
    },
    {
      id: 2,
      name: 'TechStart Inc',
      plan: 'Professional',
      dailyQuota: 50000,
      usedToday: 18450,
      rateLimit: 500,
      currentRate: 180,
      burstLimit: 1000,
      status: 'healthy',
    },
    {
      id: 3,
      name: 'FinServe Solutions',
      plan: 'Enterprise',
      dailyQuota: 100000,
      usedToday: 92100,
      rateLimit: 1000,
      currentRate: 950,
      burstLimit: 2000,
      status: 'warning',
    },
    {
      id: 4,
      name: 'Global Retail Co',
      plan: 'Enterprise',
      dailyQuota: 100000,
      usedToday: 67800,
      rateLimit: 1000,
      currentRate: 320,
      burstLimit: 2000,
      status: 'healthy',
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-white mb-2">Quota & Rate Limit Controls</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Monitor and configure messaging quotas and rate limits per tenant
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl text-slate-900 dark:text-white mb-1">223.6K</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Messages Today</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Gauge className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 dark:text-white mb-1">3</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Healthy Tenants</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl text-yellow-600 mb-1">1</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Approaching Limit</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Gauge className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 dark:text-white mb-1">62.8%</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Avg Quota Usage</p>
        </div>
      </div>

      {/* Tenant Quotas */}
      <div className="space-y-6">
        {tenants.map((tenant) => {
          const quotaPercent = (tenant.usedToday / tenant.dailyQuota) * 100;
          const ratePercent = (tenant.currentRate / tenant.rateLimit) * 100;

          return (
            <div
              key={tenant.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-gray-900/50 transition-all"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-slate-900 dark:text-white">{tenant.name}</h3>
                    <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full">
                      {tenant.plan}
                    </span>
                    {tenant.status === 'warning' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        Approaching Limit
                      </div>
                    )}
                  </div>
                </div>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Quota */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm text-slate-700 dark:text-slate-300">Daily Message Quota</h4>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {quotaPercent.toFixed(1)}% used
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-gray-800 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        quotaPercent > 90
                          ? 'bg-red-500'
                          : quotaPercent > 75
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${quotaPercent}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>{tenant.usedToday.toLocaleString()} used</span>
                    <span>{tenant.dailyQuota.toLocaleString()} limit</span>
                  </div>
                </div>

                {/* Rate Limit */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm text-slate-700 dark:text-slate-300">Current Rate (per minute)</h4>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {ratePercent.toFixed(1)}% of limit
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-gray-800 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        ratePercent > 90
                          ? 'bg-red-500'
                          : ratePercent > 75
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${ratePercent}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>{tenant.currentRate} msg/min</span>
                    <span>{tenant.rateLimit} limit • {tenant.burstLimit} burst</span>
                  </div>
                </div>
              </div>

              {tenant.status === 'warning' && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-900 dark:text-yellow-200 mb-1">
                        Quota limit exceeded
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        This tenant has consumed 92% of their daily quota. Consider increasing their limit or notifying them.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Rate Limit Settings */}
      <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
        <h3 className="text-slate-900 dark:text-white mb-6">Global Rate Limit Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
              Default Rate Limit (per minute)
            </label>
            <input
              type="number"
              defaultValue="1000"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
              Burst Limit
            </label>
            <input
              type="number"
              defaultValue="2000"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
              Alert Threshold (%)
            </label>
            <input
              type="number"
              defaultValue="85"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
          Save Global Settings
        </button>
      </div>
    </div>
  );
}
