import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  ChevronDown,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  MessageCircle,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Timer,
  Mail,
  InboxIcon,
  Bell,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '../../contexts/OrganizationContext';
import { OrganizationBadge } from '../OrganizationBadge';
import { sanitizeInput } from '../../utils/security';
import { apiService } from '../../utils/api';
import { Pagination } from '../shared/Pagination';

interface Message {
  id: number;
  to: string;
  template: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'fcm';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  retries: number;
  payload?: Record<string, any>;
  metaResponse?: Record<string, any>;
  webhookLog: Array<{
    event: string;
    timestamp: string;
    status: string;
    error?: string;
  }>;
  subject?: string;
  recipientEmail?: string;
  recipientFcmToken?: string;
}

type StatFilter = 'all' | 'whatsapp' | 'sms' | 'email' | 'fcm' | 'delivered' | 'sent' | 'failed' | 'pending' | 'read';

export function MessageLogs() {
  const { currentOrganization } = useOrganization();
  const [selectedLog, setSelectedLog] = useState<number | null>(null);
  const [selectedLogData, setSelectedLogData] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'sms' | 'email' | 'fcm'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>('all');
  const [logs, setLogs] = useState<Message[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30days');
  const [exportLoading, setExportLoading] = useState(false);

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

  // Fetch message logs from API
  useEffect(() => {
    const fetchMessageLogs = async () => {
      if (!currentOrganization) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const dateRangeObj = getDateRange();
        const response = await apiService.messages.list({ 
          page: currentPage, 
          limit: recordsPerPage,
          startDate: dateRangeObj.startDate,
          endDate: dateRangeObj.endDate,
        });
        if (response.success && response.data) {
          const messagesData = response.data.messages || response.data;
          setLogs(messagesData.map((message: any) => ({
            id: message.id,
            to: message.recipientPhone || message.recipientEmail || message.recipientFcmToken?.substring(0, 20) + '...' || 'N/A',
            template: message.template?.name || message.content || 'No template',
            channel: message.channel,
            timestamp: message.createdAt || new Date().toISOString(),
            status: message.deliveryStatus || 'pending',
            retries: message.retryCount || 0,
            payload: message.variables || {},
            metaResponse: message.externalMessageId ? { id: message.externalMessageId } : {},
            webhookLog: message.events || [],
            subject: message.subject,
            recipientEmail: message.recipientEmail,
            recipientFcmToken: message.recipientFcmToken,
          })));
          
          // Extract pagination metadata
          if (response.data.pagination) {
            setTotalPages(response.data.pagination.totalPages || 1);
            setTotalRecords(response.data.pagination.total || 0);
          } else {
            setTotalPages(1);
            setTotalRecords(messagesData.length);
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch message logs:', error);
        toast.error('Failed to load message logs', {
          description: error.response?.data?.error?.message || error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessageLogs();
  }, [currentOrganization, currentPage, dateRange]);

  const handleSearchChange = (e: any) => {
    const sanitized = sanitizeInput(e.target.value, 100);
    setSearchQuery(sanitized);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.template.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = channelFilter === 'all' || log.channel === channelFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    // Apply stat card filter
    let matchesStatFilter = true;
    if (activeStatFilter === 'whatsapp') {
      matchesStatFilter = log.channel === 'whatsapp';
    } else if (activeStatFilter === 'sms') {
      matchesStatFilter = log.channel === 'sms';
    } else if (activeStatFilter === 'email') {
      matchesStatFilter = log.channel === 'email';
    } else if (activeStatFilter === 'fcm') {
      matchesStatFilter = log.channel === 'fcm';
    } else if (activeStatFilter === 'delivered') {
      matchesStatFilter = log.status === 'delivered';
    } else if (activeStatFilter === 'sent') {
      matchesStatFilter = log.status === 'sent';
    } else if (activeStatFilter === 'failed') {
      matchesStatFilter = log.status === 'failed';
    } else if (activeStatFilter === 'pending') {
      matchesStatFilter = log.status === 'pending';
    } else if (activeStatFilter === 'read') {
      matchesStatFilter = log.status === 'read';
    }

    return matchesSearch && matchesChannel && matchesStatus && matchesStatFilter;
  });

  const stats = {
    total: logs.length,
    whatsapp: logs.filter((l) => l.channel === 'whatsapp').length,
    sms: logs.filter((l) => l.channel === 'sms').length,
    email: logs.filter((l) => l.channel === 'email').length,
    fcm: logs.filter((l) => l.channel === 'fcm').length,
    delivered: logs.filter((l) => l.status === 'delivered').length,
    sent: logs.filter((l) => l.status === 'sent').length,
    read: logs.filter((l) => l.status === 'read').length,
    failed: logs.filter((l) => l.status === 'failed').length,
    pending: logs.filter((l) => l.status === 'pending').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'sent':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'read':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'pending':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'read':
        return <Mail className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="colorful p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl text-gray-900 dark:text-white">Message Logs</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          View and analyze all sent messages across channels
        </p>
      </div>

      {/* Dashboard Stats - Channel Split */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button
          onClick={() => setActiveStatFilter('all')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'all'
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Messages</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatFilter('whatsapp')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'whatsapp'
              ? 'border-green-500 ring-2 ring-green-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.whatsapp}</p>
            </div>
            <MessageCircle className="w-8 h-8 text-green-600" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatFilter('sms')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'sms'
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">SMS</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.sms}</p>
            </div>
            <Smartphone className="w-8 h-8 text-blue-600" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatFilter('email')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'email'
              ? 'border-purple-500 ring-2 ring-purple-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.email}</p>
            </div>
            <Mail className="w-8 h-8 text-purple-600" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatFilter('fcm')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'fcm'
              ? 'border-orange-500 ring-2 ring-orange-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">FCM</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.fcm}</p>
            </div>
            <Bell className="w-8 h-8 text-orange-600" />
          </div>
        </button>
      </div>

      {/* Dashboard Stats - Status Split */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button
          onClick={() => setActiveStatFilter('delivered')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'delivered'
              ? 'border-green-500 ring-2 ring-green-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Delivered</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.delivered}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatFilter('sent')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'sent'
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sent</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.sent}</p>
            </div>
            <Send className="w-8 h-8 text-blue-600" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatFilter('read')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'read'
              ? 'border-purple-500 ring-2 ring-purple-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Read</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.read}</p>
            </div>
            <Mail className="w-8 h-8 text-purple-600" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatFilter('pending')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'pending'
              ? 'border-orange-500 ring-2 ring-orange-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatFilter('failed')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'failed'
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.failed}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone number or template name..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as 'all' | 'whatsapp' | 'sms' | 'email' | 'fcm')}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="fcm">FCM</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="delivered">Delivered</option>
            <option value="sent">Sent</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          {/* Date Range Picker */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="1year">Last Year</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={async () => {
              setExportLoading(true);
              try {
                const dateRangeObj = getDateRange();
                const blob = await apiService.messages.export({
                  startDate: dateRangeObj.startDate,
                  endDate: dateRangeObj.endDate,
                  channel: channelFilter !== 'all' ? channelFilter : undefined,
                  status: statusFilter !== 'all' ? statusFilter : undefined,
                });

                // Create blob URL
                const url = window.URL.createObjectURL(blob);
                
                // Create temporary anchor element
                const link = document.createElement('a');
                link.href = url;
                
                // Generate filename
                const dateRangeStr = `${dateRangeObj.startDate}_to_${dateRangeObj.endDate}`;
                link.download = `All_Messages_Report_${dateRangeStr}.xlsx`;
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                
                // Cleanup
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                toast.success('Message logs exported successfully');
              } catch (error: any) {
                console.error('Failed to export message logs:', error);
                toast.error('Failed to export message logs', {
                  description: error?.response?.data?.message || error.message,
                });
              } finally {
                setExportLoading(false);
              }
            }}
            disabled={exportLoading}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {exportLoading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Message Logs Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Retries
                </th>
                <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No message logs found matching your filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">{log.to}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {log.template}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs capitalize ${
                          log.channel === 'whatsapp'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : log.channel === 'sms'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                            : log.channel === 'email'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                        }`}
                      >
                        {log.channel === 'whatsapp' ? (
                          <MessageCircle className="w-3 h-3" />
                        ) : log.channel === 'sms' ? (
                          <Smartphone className="w-3 h-3" />
                        ) : log.channel === 'email' ? (
                          <Mail className="w-3 h-3" />
                        ) : (
                          <Bell className="w-3 h-3" />
                        )}
                        {log.channel.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs capitalize ${getStatusBadge(
                          log.status
                        )}`}
                      >
                        {getStatusIcon(log.status)}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {log.timestamp}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm ${
                          log.retries > 0
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {log.retries}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={async () => {
                            setSelectedLog(log.id);
                            setLoadingDetails(true);
                            try {
                              const response = await apiService.messages.getById(log.id);
                              if (response.success && response.data) {
                                setSelectedLogData(response.data);
                              }
                            } catch (error: any) {
                              console.error('Failed to fetch message details:', error);
                              toast.error('Failed to load message details');
                            } finally {
                              setLoadingDetails(false);
                            }
                          }}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setCurrentPage}
        recordsPerPage={recordsPerPage}
      />

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl text-gray-900 dark:text-white">Message Trace Logs</h2>
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setSelectedLogData(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedLogData ? (
                <>
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Recipient</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedLogData.recipientPhone || selectedLogData.recipientEmail || 
                           (selectedLogData.recipientFcmToken ? selectedLogData.recipientFcmToken.substring(0, 30) + '...' : 'N/A')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Channel</p>
                        <p className="text-sm text-gray-900 dark:text-white capitalize">
                          {selectedLogData.channel}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs capitalize ${getStatusBadge(
                            selectedLogData.deliveryStatus || selectedLogData.status
                          )}`}
                        >
                          {getStatusIcon(selectedLogData.deliveryStatus || selectedLogData.status)}
                          {selectedLogData.deliveryStatus || selectedLogData.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Submitted At</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(selectedLogData.submittedAt || selectedLogData.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Template Used — only renders when this message was sent
                      via a template (not a free-text send). Shows the
                      operator the exact template content that went out,
                      with any variable substitutions applied from the
                      stored metadata.variables map. */}
                  {selectedLogData.template && (
                    <TemplateUsedPanel
                      template={selectedLogData.template}
                      variables={selectedLogData.metadata?.variables || selectedLogData.variables || {}}
                      headerMediaOverride={selectedLogData.metadata?.headerMediaUrl || null}
                    />
                  )}

                  {/* Trace Log Timeline */}
                  {selectedLogData.traceLogs && (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                        Trace Log Timeline
                      </h3>
                      <div className="space-y-3">
                        {selectedLogData.traceLogs.timeline && selectedLogData.traceLogs.timeline.length > 0 ? (
                          selectedLogData.traceLogs.timeline.map((event: any, idx: number) => {
                            const isError = event.type === 'failed' || event.data?.error;
                            const isSuccess = ['sent', 'delivered', 'read'].includes(event.type);
                            
                            return (
                              <div key={idx} className="flex items-start gap-3">
                                <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${
                                  isError ? 'bg-red-500' : isSuccess ? 'bg-green-500' : 'bg-blue-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className={`text-sm font-medium ${
                                      isError ? 'text-red-600 dark:text-red-400' : 
                                      isSuccess ? 'text-green-600 dark:text-green-400' : 
                                      'text-gray-900 dark:text-white'
                                    }`}>
                                      {event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </p>
                                    <span className="text-xs text-gray-500">
                                      {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  {event.data && Object.keys(event.data).length > 0 && (
                                    <details className="mt-1">
                                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                                        View Details
                                      </summary>
                                      <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-900 dark:text-white overflow-x-auto">
                                        {JSON.stringify(event.data, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                  {event.data?.error && (
                                    <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                                      <p className="text-red-600 dark:text-red-400 font-medium">Error:</p>
                                      <p className="text-red-700 dark:text-red-300">{event.data.error.message || event.data.error}</p>
                                      {event.data.error.stack && (
                                        <details className="mt-1">
                                          <summary className="cursor-pointer text-red-600 dark:text-red-400">Stack Trace</summary>
                                          <pre className="mt-1 text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap">
                                            {event.data.error.stack}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-gray-500">No trace logs available</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Channel-Specific Details */}
                  {selectedLogData.traceLogs?.channelSpecific && (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                        Channel-Specific Information
                      </h3>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                          {JSON.stringify(selectedLogData.traceLogs.channelSpecific, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {selectedLogData.traceLogs?.summary && (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                        Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total Events</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {selectedLogData.traceLogs.summary.totalEvents}
                          </p>
                        </div>
                        {selectedLogData.traceLogs.summary.duration && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total Duration</p>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {(selectedLogData.traceLogs.summary.duration / 1000).toFixed(2)}s
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end">
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setSelectedLogData(null);
                }}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----- Template Used panel (shown inside the message-detail modal) ----- */

import { MEDIA_HOST } from '../../utils/api';

interface TemplateLike {
  id: number;
  name: string;
  channel?: string;
  category?: string;
  language?: string;
  status?: string;
  headerType?: 'text' | 'image' | 'video' | 'document' | 'location' | null;
  headerContent?: string | null;
  body?: string;
  footer?: string | null;
  buttons?: any[] | null;
  variables?: string[] | null;
}

// Substitute {{1}}, {{name}}, etc. in `content` using the variables map that
// was stored alongside the message. Falls back to the marker itself when a
// value is missing — that way the operator sees clearly which slot was empty.
function substituteVariables(content: string, vars: Record<string, string> | undefined): string {
  if (!content) return '';
  if (!vars) return content;
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => {
    const v = vars[key];
    return v != null && String(v).trim() !== '' ? String(v) : m;
  });
}

function TemplateUsedPanel({
  template,
  variables,
  headerMediaOverride,
}: {
  template: TemplateLike;
  variables: Record<string, string>;
  headerMediaOverride?: string | null;
}) {
  const body = substituteVariables(template.body || '', variables);
  const headerText = template.headerType === 'text'
    ? substituteVariables(template.headerContent || '', variables)
    : '';
  const headerIsMedia = ['image', 'video', 'document'].includes(template.headerType || '');
  // Per-message header override (Dynamic Media Header feature) wins over the
  // template's stored sample so the operator sees the bytes that actually
  // went out for this specific send.
  const headerMediaUrl = headerIsMedia
    ? (headerMediaOverride || template.headerContent || '')
    : '';
  const resolvedMediaUrl = headerMediaUrl
    ? (headerMediaUrl.startsWith('http') ? headerMediaUrl : `${MEDIA_HOST}${headerMediaUrl}`)
    : '';
  const buttons = Array.isArray(template.buttons) ? template.buttons : [];
  const varEntries = Object.entries(variables || {});

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        Template Used
      </h3>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
        {/* Metadata strip */}
        <div className="flex items-center flex-wrap gap-3 text-xs">
          <span className="text-gray-900 dark:text-white font-semibold">{template.name}</span>
          {template.channel && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
              {template.channel}
            </span>
          )}
          {template.category && (
            <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
              {template.category}
            </span>
          )}
          {template.language && (
            <span className="text-gray-500">Language: <strong>{template.language}</strong></span>
          )}
          {template.status && (
            <span className="text-gray-500">Status: <strong className="capitalize">{template.status}</strong></span>
          )}
        </div>

        {/* WhatsApp-style preview of the actual sent content (resolved vars). */}
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: '#efeae2',
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        >
          <div className="flex justify-end">
            <div
              className="max-w-[85%] rounded-lg shadow-sm overflow-hidden"
              style={{ backgroundColor: '#d9fdd3' }}
            >
              {headerIsMedia && resolvedMediaUrl && (
                <div className="bg-black/5">
                  {template.headerType === 'image' && (
                    <img src={resolvedMediaUrl} alt="" className="w-full max-h-48 object-cover" data-color />
                  )}
                  {template.headerType === 'video' && (
                    <video src={resolvedMediaUrl} className="w-full max-h-48" controls data-color />
                  )}
                  {template.headerType === 'document' && (
                    <div className="px-3 py-2 text-xs text-gray-700 bg-white/60">
                      📄 Document attachment
                    </div>
                  )}
                </div>
              )}
              <div className="px-3 py-2">
                {headerText && (
                  <p className="text-sm font-semibold text-gray-900 mb-1 whitespace-pre-wrap">
                    {headerText}
                  </p>
                )}
                <p className="text-[15px] text-gray-900 whitespace-pre-wrap leading-snug">
                  {body || <span className="text-gray-400 italic">[empty body]</span>}
                </p>
                {template.footer && (
                  <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                    {template.footer}
                  </p>
                )}
              </div>
              {buttons.length > 0 && (
                <div className="border-t border-black/5">
                  {buttons.map((b: any, i: number) => (
                    <div
                      key={b.id || i}
                      className="px-3 py-2 text-center text-sm text-[#00a5f4] border-b last:border-b-0 border-black/5 bg-white/70"
                    >
                      {b.text || b.value || `Button ${i + 1}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Variables used for THIS message — shown raw so the operator can
            verify what was sent without having to read it out of the bubble. */}
        {varEntries.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Variables sent</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {varEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs"
                >
                  <span className="text-gray-500">{`{{${key}}}`}</span>
                  <span className="text-gray-900 dark:text-white truncate max-w-[60%]" title={String(value)}>
                    {String(value) || <em className="text-gray-400">empty</em>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}