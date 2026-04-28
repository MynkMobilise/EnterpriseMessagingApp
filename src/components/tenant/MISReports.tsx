import { useState, useEffect } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  MessageSquare,
  Users,
  Target,
  Activity,
  FileText,
  PieChart,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type ReportType = 
  | 'message_volume'
  | 'template_performance'
  | 'delivery_success'
  | 'cost_analysis'
  | 'user_activity'
  | 'channel_comparison'
  | 'all_messages';

export function MISReports() {
  const { currentOrganization } = useOrganization();
  const [activeReport, setActiveReport] = useState<ReportType>('message_volume');
  const [dateRange, setDateRange] = useState('30days');
  const [loading, setLoading] = useState(false);

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '30days':
        start.setDate(end.getDate() - 30);
        break;
      case '90days':
        start.setDate(end.getDate() - 90);
        break;
      case '1year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const reports = [
    {
      id: 'message_volume' as ReportType,
      title: 'Message Volume Report',
      description: 'Daily and monthly message trends',
      icon: MessageSquare,
      color: 'blue',
    },
    {
      id: 'template_performance' as ReportType,
      title: 'Template Performance',
      description: 'Which templates perform best',
      icon: FileText,
      color: 'purple',
    },
    {
      id: 'delivery_success' as ReportType,
      title: 'Delivery Success Rate',
      description: 'Message delivery analytics',
      icon: Target,
      color: 'green',
    },
    {
      id: 'cost_analysis' as ReportType,
      title: 'Cost Analysis Report',
      description: 'Spending by category and country',
      icon: DollarSign,
      color: 'orange',
    },
    {
      id: 'user_activity' as ReportType,
      title: 'User Activity Report',
      description: 'Who sends the most messages',
      icon: Users,
      color: 'pink',
    },
    {
      id: 'channel_comparison' as ReportType,
      title: 'Channel Comparison',
      description: 'WhatsApp vs SMS performance',
      icon: Activity,
      color: 'indigo',
    },
    {
      id: 'all_messages' as ReportType,
      title: 'All Messages Report',
      description: 'Complete message log with details',
      icon: MessageSquare,
      color: 'indigo',
    },
  ];

  const handleExportReport = async () => {
    try {
      setLoading(true);
      const dateRangeObj = getDateRange();
      
      const blob = await apiService.reports.exportReport(
        activeReport,
        dateRangeObj.startDate,
        dateRangeObj.endDate
      );

      // Create blob URL
      const url = window.URL.createObjectURL(blob);
      
      // Create temporary anchor element
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const dateRange = `${dateRangeObj.startDate}_to_${dateRangeObj.endDate}`;
      const filenameMap: Record<ReportType, string> = {
        message_volume: 'Message_Volume_Report',
        template_performance: 'Template_Performance_Report',
        delivery_success: 'Delivery_Success_Report',
        cost_analysis: 'Cost_Analysis_Report',
        user_activity: 'User_Activity_Report',
        channel_comparison: 'Channel_Comparison_Report',
        all_messages: 'All_Messages_Report',
      };
      link.download = `${filenameMap[activeReport]}_${dateRange}.xlsx`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error: any) {
      console.error('Failed to export report:', error);
      toast.error(error?.response?.data?.message || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">MIS Reports</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive analytics and business intelligence
          </p>
        </div>
        <button
          onClick={handleExportReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          const isActive = activeReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm text-gray-900 dark:text-white mb-1">
                    {report.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {report.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2">
            {['7days', '30days', '90days', '1year', 'custom'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {range === '7days' && 'Last 7 Days'}
                {range === '30days' && 'Last 30 Days'}
                {range === '90days' && 'Last 90 Days'}
                {range === '1year' && 'Last Year'}
                {range === 'custom' && 'Custom Range'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Content */}
      {activeReport === 'message_volume' && <MessageVolumeReport dateRange={getDateRange()} />}
      {activeReport === 'template_performance' && <TemplatePerformanceReport dateRange={getDateRange()} />}
      {activeReport === 'delivery_success' && <DeliverySuccessReport dateRange={getDateRange()} />}
      {activeReport === 'cost_analysis' && <CostAnalysisReport dateRange={getDateRange()} />}
      {activeReport === 'user_activity' && <UserActivityReport dateRange={getDateRange()} />}
      {activeReport === 'channel_comparison' && <ChannelComparisonReport dateRange={getDateRange()} />}
      {activeReport === 'all_messages' && <AllMessagesReport dateRange={getDateRange()} />}
    </div>
  );
}

// Report 1: Message Volume Report
function MessageVolumeReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { currentOrganization } = useOrganization();
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, approved: 0, rejected: 0, dailyAverage: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiService.reports.getMessageVolume(dateRange);
        if (response.success && response.data) {
          setSummary(response.data);
          setData(response.data.chartData || []);
        }
      } catch (error) {
        console.error('Failed to fetch message volume report:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, currentOrganization?.id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Messages</p>
          <p className="text-2xl text-gray-900 dark:text-white">{summary.total.toLocaleString()}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
            {summary.total > 0 ? 'Total messages' : 'No data available'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved</p>
          <p className="text-2xl text-green-600">{summary.approved.toLocaleString()}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {summary.total > 0 ? `${((summary.approved / summary.total) * 100).toFixed(1)}% approval rate` : '0% approval rate'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rejected</p>
          <p className="text-2xl text-red-600">{summary.rejected.toLocaleString()}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {summary.total > 0 ? `${((summary.rejected / summary.total) * 100).toFixed(1)}% rejection rate` : '0% rejection rate'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Daily Average</p>
          <p className="text-2xl text-blue-600">{summary.dailyAverage.toLocaleString()}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">messages per day</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg text-gray-900 dark:text-white mb-4">Daily Breakdown</h3>
        {data.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            No data available for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Messages</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">SMS</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">WhatsApp</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">FCM</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Approved</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Rejected</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Success Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: any, index: number) => {
                  const total = (item.approved || 0) + (item.rejected || 0);
                  const successRate = total > 0 ? ((item.approved / total) * 100).toFixed(2) : '0.00';
                  return (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{item.date || '-'}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">{total.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">-</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">-</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">-</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">-</td>
                      <td className="py-3 px-4 text-sm text-right text-green-600">{(item.approved || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right text-red-600">{(item.rejected || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">{successRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Report 2: Template Performance Report
function TemplatePerformanceReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { currentOrganization } = useOrganization();
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ activeTemplates: 0, avgDeliveryRate: 0, avgReadRate: 0, avgClickRate: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiService.reports.getTemplatePerformance(dateRange);
        if (response.success && response.data) {
          setSummary(response.data);
          setData(response.data.templates || []);
        }
      } catch (error) {
        console.error('Failed to fetch template performance report:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, currentOrganization?.id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Templates</p>
          <p className="text-2xl text-gray-900 dark:text-white">{summary.activeTemplates}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Delivery Rate</p>
          <p className="text-2xl text-green-600">{summary.avgDeliveryRate.toFixed(1)}%</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Read Rate</p>
          <p className="text-2xl text-blue-600">{summary.avgReadRate.toFixed(1)}%</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Click Rate</p>
          <p className="text-2xl text-purple-600">{summary.avgClickRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg text-gray-900 dark:text-white mb-4">
          Top 5 Template Performance
        </h3>
        {data.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
            No template data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="template" stroke="#9ca3af" angle={-15} textAnchor="end" height={100} />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
              <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
              <Bar dataKey="read" fill="#8b5cf6" name="Read" />
              <Bar dataKey="clicked" fill="#f59e0b" name="Clicked" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase">
                Template
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Sent
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Delivery Rate
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Read Rate
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Click Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No template performance data available
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.template}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {row.template}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">
                    {row.sent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-green-600 text-right">
                    {row.sent > 0 ? ((row.delivered / row.sent) * 100).toFixed(1) : '0'}%
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600 text-right">
                    {row.sent > 0 ? ((row.read / row.sent) * 100).toFixed(1) : '0'}%
                  </td>
                  <td className="px-6 py-4 text-sm text-purple-600 text-right">
                    {row.sent > 0 ? ((row.clicked / row.sent) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Report 3: Delivery Success Report
function DeliverySuccessReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { currentOrganization } = useOrganization();
  const [pieData, setPieData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ overallSuccessRate: 0, totalDelivered: 0, failed: 0, readRate: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiService.reports.getDeliverySuccess(dateRange);
        if (response.success && response.data) {
          setSummary(response.data);
          setPieData(response.data.pieData || []);
          setTrendData(response.data.trendData || []);
        }
      } catch (error) {
        console.error('Failed to fetch delivery success report:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, currentOrganization?.id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Success Rate</p>
          <p className="text-2xl text-green-600">{summary.overallSuccessRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
            {summary.overallSuccessRate > 0 ? 'Success rate' : 'No data available'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Delivered</p>
          <p className="text-2xl text-gray-900 dark:text-white">{summary.totalDelivered.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Failed</p>
          <p className="text-2xl text-red-600">{summary.failed.toLocaleString()}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {summary.totalDelivered + summary.failed > 0 
              ? `${((summary.failed / (summary.totalDelivered + summary.failed)) * 100).toFixed(1)}% failure rate`
              : '0% failure rate'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Read Rate</p>
          <p className="text-2xl text-blue-600">{summary.readRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg text-gray-900 dark:text-white mb-4">Delivery Status Breakdown</h3>
          {pieData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No delivery data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg text-gray-900 dark:text-white mb-4">Success Rate Trend</h3>
          {trendData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No trend data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="week" stroke="#9ca3af" />
                <YAxis domain={[95, 100]} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Success Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg text-gray-900 dark:text-white mb-4">Weekly/Daily Trends</h3>
        {trendData.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            No trend data available for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Period</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Sent</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Delivered</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Failed</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Success Rate (%)</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Trend</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((item: any, index: number) => {
                  const prevItem = index > 0 ? trendData[index - 1] : null;
                  const trend = prevItem 
                    ? (item.rate > prevItem.rate ? '↑' : item.rate < prevItem.rate ? '↓' : '→')
                    : '-';
                  const trendColor = prevItem
                    ? (item.rate > prevItem.rate ? 'text-green-600' : item.rate < prevItem.rate ? 'text-red-600' : 'text-gray-600')
                    : 'text-gray-600';
                  return (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{item.week || '-'}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">-</td>
                      <td className="py-3 px-4 text-sm text-right text-green-600">-</td>
                      <td className="py-3 px-4 text-sm text-right text-red-600">-</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">{item.rate?.toFixed(2) || '0.00'}%</td>
                      <td className={`py-3 px-4 text-sm text-right font-semibold ${trendColor}`}>{trend}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Report 4: Cost Analysis Report
function CostAnalysisReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { currentOrganization } = useOrganization();
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalSpend: 0, avgCostPerMessage: 0, marketingSpend: 0, projectedMonthly: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiService.reports.getCostAnalysis(dateRange);
        if (response.success && response.data) {
          setSummary(response.data);
          setCategoryData(response.data.categoryData || []);
          setCountryData(response.data.countryData || []);
        }
      } catch (error) {
        console.error('Failed to fetch cost analysis report:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, currentOrganization?.id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spend</p>
          <p className="text-2xl text-gray-900 dark:text-white">${summary.totalSpend.toFixed(2)}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
            {summary.totalSpend > 0 ? 'Total cost' : 'No data available'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Cost/Message</p>
          <p className="text-2xl text-blue-600">${summary.avgCostPerMessage.toFixed(4)}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Marketing Spend</p>
          <p className="text-2xl text-orange-600">${summary.marketingSpend.toFixed(2)}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {summary.totalSpend > 0 ? `${((summary.marketingSpend / summary.totalSpend) * 100).toFixed(1)}% of total` : '0% of total'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Projected Monthly</p>
          <p className="text-2xl text-purple-600">${summary.projectedMonthly.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Category */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg text-gray-900 dark:text-white mb-4">Cost by Category</h3>
          {categoryData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No cost data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="category" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="cost" fill="#f59e0b" name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cost by Country */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg text-gray-900 dark:text-white mb-4">Cost by Country</h3>
          {countryData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No country data available
            </div>
          ) : (
            <div className="space-y-3">
              {countryData.map((item) => (
                <div key={item.country}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-900 dark:text-white">{item.country}</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      ${item.cost} ({item.messages.toLocaleString()} msgs)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(item.cost / 1210) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg text-gray-900 dark:text-white mb-4">Cost Breakdown</h3>
        {categoryData.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            No cost data available for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Channel</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Messages Sent</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Cost per Message ($)</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Cost ($)</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Country</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{item.category || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{item.category || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">-</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">-</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">${item.cost?.toFixed(2) || '0.00'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Report 5: User Activity Report
function UserActivityReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { currentOrganization } = useOrganization();
  const [userData, setUserData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ activeUsers: 0, topSender: '-', topSenderMessages: 0, avgPerUser: 0, mostActiveDept: '-' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiService.reports.getUserActivity(dateRange);
        if (response.success && response.data) {
          setSummary(response.data);
          setUserData(response.data.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch user activity report:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, currentOrganization?.id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Users</p>
          <p className="text-2xl text-gray-900 dark:text-white">{summary.activeUsers}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Top Sender</p>
          <p className="text-2xl text-blue-600">{summary.topSender}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{summary.topSenderMessages.toLocaleString()} messages</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg per User</p>
          <p className="text-2xl text-green-600">{summary.avgPerUser}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">messages/month</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Most Active Dept</p>
          <p className="text-2xl text-purple-600">{summary.mostActiveDept}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <h3 className="text-lg text-gray-900 dark:text-white p-6 pb-4">Top 5 Active Users</h3>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase">
                Department
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Total Messages
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Approved
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Rejected
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Success Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {userData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No user activity data available
                </td>
              </tr>
            ) : (
              userData.map((row, index) => (
                <tr key={row.user}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{row.user}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {row.dept}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">
                    {row.messages.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-green-600 text-right">
                    {row.approved.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 text-right">
                    {row.rejected.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600 text-right">
                    {row.messages > 0 ? ((row.approved / row.messages) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Report 6: Channel Comparison Report
function ChannelComparisonReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { currentOrganization } = useOrganization();
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ whatsappShare: 0, smsShare: 0, whatsappReadRate: 0, smsReadRate: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiService.reports.getChannelComparison(dateRange);
        if (response.success && response.data) {
          setSummary(response.data);
          setComparisonData(response.data.comparisonData || []);
          setTrendData(response.data.trendData || []);
        }
      } catch (error) {
        console.error('Failed to fetch channel comparison report:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, currentOrganization?.id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">WhatsApp Share</p>
          <p className="text-2xl text-green-600">{summary.whatsappShare.toFixed(1)}%</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">of total volume</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">SMS Share</p>
          <p className="text-2xl text-blue-600">{summary.smsShare.toFixed(1)}%</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">of total volume</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">WhatsApp Read Rate</p>
          <p className="text-2xl text-purple-600">{summary.whatsappReadRate.toFixed(1)}%</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">SMS Read Rate</p>
          <p className="text-2xl text-orange-600">{summary.smsReadRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Trend */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg text-gray-900 dark:text-white mb-4">Volume Trend Comparison</h3>
          {trendData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No trend data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="whatsapp"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="WhatsApp"
                />
                <Line
                  type="monotone"
                  dataKey="sms"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="SMS"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Performance Comparison */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg text-gray-900 dark:text-white mb-4">Performance Comparison</h3>
          {comparisonData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No comparison data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="channel" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
                <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
                <Bar dataKey="read" fill="#8b5cf6" name="Read" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <h3 className="text-lg text-gray-900 dark:text-white p-6 pb-4">Detailed Metrics</h3>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase">
                Channel
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Sent
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Delivered
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Read
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Total Cost
              </th>
              <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase">
                Cost/Message
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {comparisonData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No channel comparison data available
                </td>
              </tr>
            ) : (
              comparisonData.map((row) => (
                <tr key={row.channel}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {row.channel}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">
                    {row.sent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-green-600 text-right">
                    {row.delivered.toLocaleString()} ({row.sent > 0 ? ((row.delivered / row.sent) * 100).toFixed(1) : '0'}
                    %)
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600 text-right">
                    {row.read.toLocaleString()} ({row.sent > 0 ? ((row.read / row.sent) * 100).toFixed(1) : '0'}%)
                  </td>
                  <td className="px-6 py-4 text-sm text-orange-600 text-right">
                    ${row.cost.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-purple-600 text-right">
                    ${(row.cost / row.sent).toFixed(3)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Report 7: All Messages Report
function AllMessagesReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { currentOrganization } = useOrganization();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiService.reports.getAllMessages(dateRange);
        if (response.success && response.data) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch all messages report:', error);
        toast.error('Failed to load all messages report');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, currentOrganization?.id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Messages</p>
          <p className="text-2xl text-gray-900 dark:text-white">{data.total?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">By Channel</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            WhatsApp: {data.byChannel?.whatsapp || 0} | SMS: {data.byChannel?.sms || 0} | Email: {data.byChannel?.email || 0} | FCM: {data.byChannel?.fcm || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">By Status</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Sent: {data.byStatus?.sent || 0} | Delivered: {data.byStatus?.delivered || 0} | Failed: {data.byStatus?.failed || 0} | Pending: {data.byStatus?.pending || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">By Approval</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Approved: {data.byApprovalStatus?.approved || 0} | Rejected: {data.byApprovalStatus?.rejected || 0} | Pending: {data.byApprovalStatus?.pending || 0}
          </p>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <h3 className="text-lg text-gray-900 dark:text-white p-6 pb-4">All Messages</h3>
        {!data.messages || data.messages.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            No messages available for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date/Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Recipient</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Channel</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Template</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Approval</th>
                </tr>
              </thead>
              <tbody>
                {data.messages.slice(0, 100).map((message: any, index: number) => {
                  const recipient = message.recipientPhone || message.recipientEmail || 
                    (message.recipientFcmToken ? message.recipientFcmToken.substring(0, 20) + '...' : 'N/A');
                  const templateName = message.template?.name || 'No template';
                  const dateTime = message.createdAt ? new Date(message.createdAt).toLocaleString() : 'N/A';
                  
                  return (
                    <tr key={message.id || index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{dateTime}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{recipient}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 capitalize">{message.channel || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{templateName}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          message.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          message.deliveryStatus === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          message.deliveryStatus === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {message.deliveryStatus || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          message.approvalStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          message.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {message.approvalStatus || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.messages.length > 100 && (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Showing first 100 messages. Export to see all {data.messages.length} messages.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
