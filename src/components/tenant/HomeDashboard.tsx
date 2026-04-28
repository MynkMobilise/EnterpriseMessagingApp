import { useState, useEffect } from 'react';
import { TrendingUp, MessageSquare, CheckCircle2, XCircle, AlertTriangle, Zap, BarChart3, FileText, Users, Mail, Bell, Smartphone, MessageCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrganization } from '../../contexts/OrganizationContext';
import { OrganizationBadge } from '../OrganizationBadge';
import { apiService } from '../../utils/api';

interface Stat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: any;
  color: string;
}

interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
}

interface TemplateUsageData {
  id: string;
  name: string;
  value: number;
  color: string;
}

interface MessageActivityData {
  time: string;
  sent: number;
  delivered: number;
}

interface RecentActivity {
  id: number;
  type: string;
  title: string;
  template?: string;
  time: string;
  status: string;
}

export function HomeDashboard() {
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState<Stat[]>([]);
  const [failureReasons, setFailureReasons] = useState<FailureReason[]>([]);
  const [templateUsage, setTemplateUsage] = useState<TemplateUsageData[]>([]);
  const [messageActivity, setMessageActivity] = useState<MessageActivityData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentOrganization) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch all dashboard data in parallel
        const [
          statsResponse,
          activityResponse,
          templateUsageResponse,
          failureReasonsResponse,
          recentActivityResponse,
        ] = await Promise.all([
          apiService.dashboard.getStats(),
          apiService.dashboard.getActivity(),
          apiService.dashboard.getTemplateUsage(),
          apiService.dashboard.getFailureReasons(),
          apiService.dashboard.getRecentActivity(),
        ]);

        // Process stats
        if (statsResponse.success && statsResponse.data) {
          const statsData = statsResponse.data;
          setStats([
            {
              label: "Today's Messages",
              value: statsData.todayMessages?.toString() || '0',
              change: '0%',
              trend: 'up',
              icon: MessageSquare,
              color: 'text-blue-600',
            },
            {
              label: 'Pending Approvals',
              value: statsData.pendingApprovals?.toString() || '0',
              change: '0%',
              trend: 'up',
              icon: AlertTriangle,
              color: 'text-yellow-600',
            },
            {
              label: 'Active Templates',
              value: statsData.activeTemplates?.toString() || '0',
              change: '0%',
              trend: 'up',
              icon: FileText,
              color: 'text-purple-600',
            },
            {
              label: 'Total Contacts',
              value: statsData.totalContacts?.toString() || '0',
              change: '0%',
              trend: 'up',
              icon: Users,
              color: 'text-green-600',
            },
            {
              label: "Today's WhatsApp",
              value: statsData.todayWhatsapp?.toString() || '0',
              change: '0%',
              trend: 'up' as const,
              icon: MessageCircle,
              color: 'text-green-600',
            },
            {
              label: "Today's SMS",
              value: statsData.todaySms?.toString() || '0',
              change: '0%',
              trend: 'up' as const,
              icon: Smartphone,
              color: 'text-blue-600',
            },
            {
              label: "Today's Email",
              value: statsData.todayEmail?.toString() || '0',
              change: '0%',
              trend: 'up' as const,
              icon: Mail,
              color: 'text-purple-600',
            },
            {
              label: "Today's FCM",
              value: statsData.todayFcm?.toString() || '0',
              change: '0%',
              trend: 'up' as const,
              icon: Bell,
              color: 'text-orange-600',
            },
          ]);
        }

        // Process message activity
        if (activityResponse.success && activityResponse.data) {
          setMessageActivity(activityResponse.data);
        }

        // Process template usage
        if (templateUsageResponse.success && templateUsageResponse.data) {
          setTemplateUsage(templateUsageResponse.data);
        }

        // Process failure reasons
        if (failureReasonsResponse.success && failureReasonsResponse.data) {
          setFailureReasons(failureReasonsResponse.data);
        }

        // Process recent activity
        if (recentActivityResponse.success && recentActivityResponse.data) {
          setRecentActivity(recentActivityResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Keep empty state on error
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentOrganization]);

  const hasData = stats.length > 0 || messageActivity.length > 0 || recentActivity.length > 0;

  return (
    <div className="p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl text-gray-900 dark:text-white mb-2">Home Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back! Here's your messaging overview across all channels.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 md:gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.trend === 'up' && !stat.label.includes('Failed');
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/20 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
                <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`w-4 h-4 ${stat.trend === 'down' && 'rotate-180'}`} />
                  <span className="text-sm">{stat.change}</span>
                </div>
              </div>
              <h3 className="text-2xl md:text-3xl text-gray-900 dark:text-white mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Message Activity Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <h3 className="text-gray-900 dark:text-white mb-6">Message Activity (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={messageActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} name="Sent" />
              <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} name="Delivered" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Template Usage Pie Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <h3 className="text-gray-900 dark:text-white mb-6">Template Usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={templateUsage}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {templateUsage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {templateUsage.map((item, index) => (
              <div key={item.id || `template-${item.name}-${index}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                </div>
                <span className="text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Failure Reasons */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <h3 className="text-gray-900 dark:text-white mb-6">Top Failure Reasons</h3>
          <div className="space-y-4">
            {failureReasons.map((item, index) => (
              <div key={item.reason}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">#{index + 1}</span>
                    <span className="text-sm text-gray-900 dark:text-white">{item.reason}</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <h3 className="text-gray-900 dark:text-white mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  activity.status === 'delivered' || activity.status === 'success'
                    ? 'bg-green-500'
                    : activity.status === 'failed'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white mb-1">{activity.title}</p>
                  {activity.template && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Template: {activity.template}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ERP Integration Status Card */}
      <div className="mt-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-blue-900 dark:text-blue-100 mb-2">ERP Integration Status</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                Your SAP integration is active and receiving webhooks
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-blue-900 dark:text-blue-100">Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-800 dark:text-blue-200">Last sync: 2 min ago</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-800 dark:text-blue-200">847 events today</span>
                </div>
              </div>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-600/20">
            Configure
          </button>
        </div>
      </div>
    </div>
  );
}