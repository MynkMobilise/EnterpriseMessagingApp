import { DollarSign, TrendingUp, Download, CreditCard } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function BillingUsageAnalytics() {
  const monthlyRevenue = [
    { month: 'Jan', revenue: 45200, costs: 12400 },
    { month: 'Feb', revenue: 52300, costs: 14200 },
    { month: 'Mar', revenue: 48900, costs: 13100 },
    { month: 'Apr', revenue: 61400, costs: 16800 },
    { month: 'May', revenue: 58700, costs: 15900 },
    { month: 'Jun', revenue: 67200, costs: 18300 },
  ];

  const messageUsage = [
    { date: '06-15', messages: 1150000 },
    { date: '06-16', messages: 1220000 },
    { date: '06-17', messages: 1180000 },
    { date: '06-18', messages: 1340000 },
    { date: '06-19', messages: 1290000 },
    { date: '06-20', messages: 1250000 },
  ];

  const tenantBilling = [
    {
      id: 1,
      tenant: 'Acme Corporation',
      plan: 'Enterprise',
      monthlyFee: 2499,
      messagesUsed: 890000,
      messagesIncluded: 1000000,
      overage: 0,
      totalDue: 2499,
      status: 'paid',
      billingCycle: 'Jun 1 - Jun 30, 2024',
    },
    {
      id: 2,
      tenant: 'TechStart Inc',
      plan: 'Professional',
      monthlyFee: 999,
      messagesUsed: 520000,
      messagesIncluded: 500000,
      overage: 40,
      totalDue: 1039,
      status: 'pending',
      billingCycle: 'Jun 1 - Jun 30, 2024',
    },
    {
      id: 3,
      tenant: 'FinServe Solutions',
      plan: 'Enterprise',
      monthlyFee: 2499,
      messagesUsed: 1240000,
      messagesIncluded: 1000000,
      overage: 480,
      totalDue: 2979,
      status: 'paid',
      billingCycle: 'Jun 1 - Jun 30, 2024',
    },
    {
      id: 4,
      tenant: 'Global Retail Co',
      plan: 'Enterprise',
      monthlyFee: 2499,
      messagesUsed: 780000,
      messagesIncluded: 1000000,
      overage: 0,
      totalDue: 2499,
      status: 'overdue',
      billingCycle: 'Jun 1 - Jun 30, 2024',
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-slate-900 dark:text-white">Billing & Usage Analytics</h1>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Monitor revenue, usage metrics, and tenant billing across the platform
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-3xl text-slate-900 dark:text-white mb-1">$67.2K</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Monthly Revenue</p>
          <p className="text-xs text-green-600 mt-1">+14.5% vs last month</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 dark:text-white mb-1">$18.3K</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Platform Costs</p>
          <p className="text-xs text-slate-500 mt-1">Meta API + Infrastructure</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-3xl text-slate-900 dark:text-white mb-1">$48.9K</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Net Profit</p>
          <p className="text-xs text-green-600 mt-1">72.8% margin</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-3xl text-slate-900 dark:text-white mb-1">247</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Active Subscriptions</p>
          <p className="text-xs text-slate-500 mt-1">$272 avg per tenant</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <h3 className="text-slate-900 dark:text-white mb-6">Revenue & Costs (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} name="Revenue" />
              <Bar dataKey="costs" fill="#ef4444" radius={[8, 8, 0, 0]} name="Costs" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Message Usage Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <h3 className="text-slate-900 dark:text-white mb-6">Daily Message Volume (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={messageUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="messages" stroke="#3b82f6" strokeWidth={2} name="Messages" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tenant Billing Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-gray-800">
          <h3 className="text-slate-900 dark:text-white">Tenant Billing (Current Cycle)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Messages Used
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Monthly Fee
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Overage
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Total Due
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
              {tenantBilling.map((billing) => {
                const usagePercent = (billing.messagesUsed / billing.messagesIncluded) * 100;
                return (
                  <tr key={billing.id} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-900 dark:text-white">{billing.tenant}</p>
                        <p className="text-xs text-slate-500">{billing.billingCycle}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full">
                        {billing.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {billing.messagesUsed.toLocaleString()} / {billing.messagesIncluded.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-32 bg-slate-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              usagePercent > 100
                                ? 'bg-red-500'
                                : usagePercent > 80
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-900 dark:text-white">
                        ${billing.monthlyFee.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${billing.overage > 0 ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'}`}>
                        ${billing.overage.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-900 dark:text-white">
                        ${billing.totalDue.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          billing.status === 'paid'
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : billing.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {billing.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
