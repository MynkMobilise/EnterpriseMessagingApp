import { TrendingUp, TrendingDown, Users, CheckCircle2, XCircle, AlertTriangle, Activity, Server } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function OverviewDashboard() {
  const stats = [
    {
      label: 'Total Tenants',
      value: '247',
      change: '+12',
      trend: 'up',
      subtitle: '18 added this month',
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Active Tenants',
      value: '231',
      change: '+8',
      trend: 'up',
      subtitle: '93.5% active rate',
      icon: CheckCircle2,
      color: 'green',
    },
    {
      label: 'Daily Message Volume',
      value: '1.2M',
      change: '+15.3%',
      trend: 'up',
      subtitle: 'vs yesterday',
      icon: Activity,
      color: 'purple',
    },
    {
      label: 'System Health',
      value: '99.8%',
      change: '+0.1%',
      trend: 'up',
      subtitle: 'All systems operational',
      icon: Server,
      color: 'teal',
    },
  ];

  const messageVolumeData = [
    { time: '00:00', success: 45000, failed: 1200 },
    { time: '04:00', success: 32000, failed: 800 },
    { time: '08:00', success: 78000, failed: 1500 },
    { time: '12:00', success: 95000, failed: 2100 },
    { time: '16:00', success: 110000, failed: 2400 },
    { time: '20:00', success: 87000, failed: 1800 },
    { time: '24:00', success: 52000, failed: 1100 },
  ];

  const queueHealthData = [
    { queue: 'High Priority', jobs: 245, status: 'healthy' },
    { queue: 'Standard', jobs: 1842, status: 'healthy' },
    { queue: 'Low Priority', jobs: 3567, status: 'warning' },
    { queue: 'Webhooks', jobs: 892, status: 'healthy' },
  ];

  const alerts = [
    {
      id: 1,
      type: 'warning',
      title: 'Rate limit approaching for Tenant: Acme Corp',
      message: '85% of daily quota consumed',
      time: '5 min ago',
    },
    {
      id: 2,
      type: 'error',
      title: 'WABA Connection Failed',
      message: 'Phone number +1234567890 authentication expired',
      time: '12 min ago',
    },
    {
      id: 3,
      type: 'info',
      title: 'New Template Pending Approval',
      message: '3 templates awaiting review from Meta',
      time: '1 hour ago',
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-white mb-2">Overview Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Monitor system-wide metrics, tenant health, and operational status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-gray-900/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/20 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
                <div className={`flex items-center gap-1 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="text-sm">{stat.change}</span>
                </div>
              </div>
              <h3 className="text-slate-900 dark:text-white mb-1">{stat.value}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{stat.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500">{stat.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Message Volume Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-slate-900 dark:text-white mb-1">Daily Message Volume</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Success vs failure rates over 24 hours</p>
            </div>
            <select className="px-3 py-2 text-sm bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Today</option>
              <option>Yesterday</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={messageVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="success" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="failed" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Success: 97.8%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Failed: 2.2%</span>
            </div>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <h3 className="text-slate-900 dark:text-white mb-4">System Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : alert.type === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                    : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  {alert.type === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-white mb-1">{alert.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{alert.message}</p>
                    <p className="text-xs text-slate-500">{alert.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-colors">
            View All Alerts
          </button>
        </div>
      </div>

      {/* Queue Health */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
        <h3 className="text-slate-900 dark:text-white mb-6">Worker Queue Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {queueHealthData.map((queue) => (
            <div key={queue.queue} className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600 dark:text-slate-400">{queue.queue}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    queue.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                ></span>
              </div>
              <p className="text-2xl text-slate-900 dark:text-white mb-1">{queue.jobs.toLocaleString()}</p>
              <p className="text-xs text-slate-500">jobs in queue</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
