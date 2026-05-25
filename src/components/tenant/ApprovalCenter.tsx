import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Eye,
  MessageSquare,
  User,
  Calendar,
  DollarSign,
  Users,
  Send,
  Mail,
  Bell,
  Smartphone,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Pagination } from '../shared/Pagination';

// Types
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

interface PendingMessage {
  id: string;
  recipient: string;
  recipientName?: string;
  templateName?: string;
  channel: string;
  priority: MessagePriority;
  status: ApprovalStatus;
  submittedAt: string;
  submittedBy: string;
  submittedByName?: string;
  expiresAt: string;
  content: string;
  variables?: Record<string, any>;
  messageContent?: string;
  isBulkMessage?: boolean;
  bulkSize?: number;
  organizationName?: string;
  messageType?: string;
  category?: string;
  estimatedCost?: number;
  scheduledFor?: string;
  mediaUrl?: string;
  subject?: string;
  recipientEmail?: string;
  recipientFcmToken?: string;
}

interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  avgApprovalTime: number;
}

export function ApprovalCenter() {
  const { currentOrganization } = useOrganization();
  const [pendingMessages, setPendingMessages] = useState([] as PendingMessage[]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState(null as PendingMessage | null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;

  // Fetch pending messages from API
  useEffect(() => {
    if (!currentOrganization) return;

    const fetchPendingMessages = async () => {
      setLoading(true);
      try {
        const response = await apiService.messages.listPendingApprovals({ page: currentPage, limit: recordsPerPage });
        if (response.success && response.data) {
          // API returns data as array or object with messages property
          const messagesData = Array.isArray(response.data) ? response.data : (response.data.messages || []);
          setPendingMessages(messagesData.map((msg: any) => ({
            id: msg.id,
            recipient: msg.recipientPhone || msg.recipientEmail || msg.recipientFcmToken?.substring(0, 20) + '...' || '',
            recipientName: msg.recipientName || msg.contact?.name || '',
            templateName: msg.template?.name || null,
            channel: msg.channel || 'whatsapp',
            priority: msg.priority || 'normal',
            status: msg.approvalStatus || 'pending',
            submittedAt: msg.createdAt || msg.submittedAt || new Date().toISOString(),
            submittedBy: msg.sentBy || '',
            submittedByName: 'User', // Will be populated from user lookup if needed
            expiresAt: msg.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            content: msg.content || '',
            variables: msg.variables || {},
            messageContent: msg.content || '',
            isBulkMessage: msg.isBulkMessage || false,
            bulkSize: msg.bulkBatch?.totalRecipients || 0,
            organizationName: 'Current Organization', // Will be populated from context if needed
            messageType: msg.messageType || 'text',
            category: msg.category || 'transactional',
            estimatedCost: parseFloat(msg.estimatedCost) || 0,
            scheduledFor: msg.scheduledFor || null,
            mediaUrl: msg.mediaUrl || null,
            subject: msg.subject || null,
            recipientEmail: msg.recipientEmail || null,
            recipientFcmToken: msg.recipientFcmToken || null,
          })));
          
          // Extract pagination metadata
          if (response.data.pagination) {
            setTotalPages(response.data.pagination.totalPages || 1);
            setTotalRecords(response.data.pagination.total || 0);
          } else {
            setTotalPages(1);
            setTotalRecords(messagesData.length);
          }
        } else {
          setPendingMessages([]);
          setTotalPages(1);
          setTotalRecords(0);
        }
      } catch (error: any) {
        console.error('Failed to fetch pending messages:', error);
        toast.error('Failed to load pending messages', {
          description: error.response?.data?.error?.message || error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPendingMessages();
  }, [currentOrganization?.id, currentPage]);

  const filteredMessages = pendingMessages.filter((msg) => {
    const matchesSearch =
      msg.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.templateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.submittedByName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || msg.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || msg.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats: ApprovalStats = {
    total: pendingMessages.length,
    pending: pendingMessages.filter((m) => m.status === 'pending').length,
    approved: pendingMessages.filter((m) => m.status === 'approved').length,
    rejected: pendingMessages.filter((m) => m.status === 'rejected').length,
    expired: pendingMessages.filter((m) => m.status === 'expired').length,
    avgApprovalTime: 0, // Calculate from data
  };

  const handleApprove = async (messageId: string) => {
    toast.loading('Approving message...', { id: messageId });
    try {
      const response = await apiService.messages.approve(messageId);
      if (response.success) {
        toast.success('Message approved and sent successfully!', { id: messageId });
        // Refresh pending messages
        const refreshResponse = await apiService.messages.listPendingApprovals({ page: 1, limit: 100 });
        if (refreshResponse.success && refreshResponse.data) {
          const messagesData = Array.isArray(refreshResponse.data) ? refreshResponse.data : (refreshResponse.data.messages || []);
          setPendingMessages(messagesData.map((msg: any) => ({
            id: msg.id,
            recipient: msg.recipientPhone || msg.recipientEmail || msg.recipientFcmToken?.substring(0, 20) + '...' || '',
            recipientName: msg.recipientName || msg.contact?.name || '',
            templateName: msg.template?.name || null,
            channel: msg.channel || 'whatsapp',
            priority: msg.priority || 'normal',
            status: msg.approvalStatus || 'pending',
            submittedAt: msg.createdAt || msg.submittedAt || new Date().toISOString(),
            submittedBy: msg.sentBy || '',
            submittedByName: 'User',
            expiresAt: msg.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            content: msg.content || '',
            variables: msg.variables || {},
            messageContent: msg.content || '',
            isBulkMessage: msg.isBulkMessage || false,
            bulkSize: msg.bulkBatch?.totalRecipients || 0,
            organizationName: 'Current Organization',
            messageType: msg.messageType || 'text',
            category: msg.category || 'transactional',
            estimatedCost: parseFloat(msg.estimatedCost) || 0,
            scheduledFor: msg.scheduledFor || null,
            mediaUrl: msg.mediaUrl || null,
            subject: msg.subject || null,
            recipientEmail: msg.recipientEmail || null,
            recipientFcmToken: msg.recipientFcmToken || null,
          })));
        }
      }
    } catch (error: any) {
      toast.error('Failed to approve message', {
        description: error.response?.data?.error?.message || error.message,
        id: messageId,
      });
    }
  };

  const handleReject = async (messageId: string, reason: string) => {
    toast.loading('Rejecting message...', { id: messageId });
    try {
      const response = await apiService.messages.reject(messageId, reason);
      if (response.success) {
        toast.success('Message rejected', { id: messageId });
        // Refresh pending messages
        const refreshResponse = await apiService.messages.listPendingApprovals({ page: 1, limit: 100 });
        if (refreshResponse.success && refreshResponse.data) {
          const messagesData = Array.isArray(refreshResponse.data) ? refreshResponse.data : (refreshResponse.data.messages || []);
          setPendingMessages(messagesData.map((msg: any) => ({
            id: msg.id,
            recipient: msg.recipientPhone || msg.recipientEmail || msg.recipientFcmToken?.substring(0, 20) + '...' || '',
            recipientName: msg.recipientName || msg.contact?.name || '',
            templateName: msg.template?.name || null,
            channel: msg.channel || 'whatsapp',
            priority: msg.priority || 'normal',
            status: msg.approvalStatus || 'pending',
            submittedAt: msg.createdAt || msg.submittedAt || new Date().toISOString(),
            submittedBy: msg.sentBy || '',
            submittedByName: 'User',
            expiresAt: msg.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            content: msg.content || '',
            variables: msg.variables || {},
            messageContent: msg.content || '',
            isBulkMessage: msg.isBulkMessage || false,
            bulkSize: msg.bulkBatch?.totalRecipients || 0,
            organizationName: 'Current Organization',
            messageType: msg.messageType || 'text',
            category: msg.category || 'transactional',
            estimatedCost: parseFloat(msg.estimatedCost) || 0,
            scheduledFor: msg.scheduledFor || null,
            mediaUrl: msg.mediaUrl || null,
            subject: msg.subject || null,
            recipientEmail: msg.recipientEmail || null,
            recipientFcmToken: msg.recipientFcmToken || null,
          })));
        }
      }
    } catch (error: any) {
      toast.error('Failed to reject message', {
        description: error.response?.data?.error?.message || error.message,
        id: messageId,
      });
    }
  };

  const handleBulkApprove = async () => {
    const pendingMessages = filteredMessages.filter(m => m.status === 'pending');
    const pendingCount = pendingMessages.length;
    
    if (pendingCount === 0) {
      toast.error('No pending messages to approve');
      return;
    }
    
    if (confirm(`Are you sure you want to approve all ${pendingCount} pending messages?`)) {
      try {
        const messageIds = pendingMessages.map(m => m.id);
        const response = await apiService.messages.bulkApprove(messageIds);
        if (response.success) {
          toast.success(`${response.data?.approvedCount || pendingCount} messages approved and queued for sending`);
          // Refresh pending messages
          const refreshResponse = await apiService.messages.listPendingApprovals({ page: 1, limit: 100 });
          if (refreshResponse.success && refreshResponse.data) {
            const messagesData = Array.isArray(refreshResponse.data) ? refreshResponse.data : (refreshResponse.data.messages || []);
            setPendingMessages(messagesData.map((msg: any) => ({
              id: msg.id,
              recipient: msg.recipientPhone || msg.recipientEmail || msg.recipientFcmToken?.substring(0, 20) + '...' || '',
              recipientName: msg.recipientName || msg.contact?.name || '',
              templateName: msg.template?.name || null,
              channel: msg.channel || 'whatsapp',
              priority: msg.priority || 'normal',
              status: msg.approvalStatus || 'pending',
              submittedAt: msg.createdAt || msg.submittedAt || new Date().toISOString(),
              submittedBy: msg.sentBy || '',
              submittedByName: 'User',
              expiresAt: msg.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              content: msg.content || '',
              variables: msg.variables || {},
              messageContent: msg.content || '',
              isBulkMessage: msg.isBulkMessage || false,
              bulkSize: msg.bulkBatch?.totalRecipients || 0,
              organizationName: 'Current Organization',
              messageType: msg.messageType || 'text',
              category: msg.category || 'transactional',
              estimatedCost: parseFloat(msg.estimatedCost) || 0,
              scheduledFor: msg.scheduledFor || null,
              mediaUrl: msg.mediaUrl || null,
            })));
          }
        }
      } catch (error: any) {
        console.error('Failed to bulk approve:', error);
        toast.error('Failed to approve messages', {
          description: error.response?.data?.error?.message || error.message,
        });
      }
    }
  };

  const handleViewDetails = (message: PendingMessage) => {
    setSelectedMessage(message);
    setShowDetailsModal(true);
  };

  const getPriorityColor = (priority: MessagePriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300';
      case 'normal':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      case 'low':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
          icon: <Clock className="w-3 h-3" />,
        };
      case 'approved':
        return {
          color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
          icon: <CheckCircle className="w-3 h-3" />,
        };
      case 'rejected':
        return {
          color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
          icon: <XCircle className="w-3 h-3" />,
        };
      case 'expired':
        return {
          color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
          icon: <AlertCircle className="w-3 h-3" />,
        };
      default:
        return {
          color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
          icon: <AlertCircle className="w-3 h-3" />,
        };
    }
  };

  return (
    <div className="colorful p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Message Approval Center</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Review and approve messages before sending
          </p>
        </div>
        <button
          onClick={handleBulkApprove}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
          disabled={stats.pending === 0}
        >
          <CheckCircle className="w-4 h-4" />
          Approve All Pending ({stats.pending})
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Messages</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.expired}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by recipient, template, or submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Submitted By
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                        ? 'No messages found matching your filters'
                        : 'No messages pending approval'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMessages.map((message) => {
                  const statusBadge = getStatusBadge(message.status);
                  return (
                    <tr
                      key={message.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {message.templateName || 'Custom Message'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {message.messageContent ? (message.messageContent.length > 50 ? message.messageContent.substring(0, 50) + '...' : message.messageContent) : message.content ? (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content) : 'No content'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                message.channel === 'whatsapp'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                  : message.channel === 'sms'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                                  : message.channel === 'email'
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                              }`}
                            >
                              {message.channel === 'whatsapp' ? (
                                <MessageCircle className="w-3 h-3" />
                              ) : message.channel === 'sms' ? (
                                <Smartphone className="w-3 h-3" />
                              ) : message.channel === 'email' ? (
                                <Mail className="w-3 h-3" />
                              ) : (
                                <Bell className="w-3 h-3" />
                              )}
                              {message.channel.toUpperCase()}
                            </span>
                            {message.isBulkMessage && message.bulkSize && message.bulkSize > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                <Users className="w-3 h-3" />
                                Bulk ({message.bulkSize})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {message.recipientName || message.recipient}
                          </p>
                          <p className="text-xs text-gray-500">{message.recipient}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {message.submittedByName}
                          </p>
                          {message.organizationName && (
                            <p className="text-xs text-gray-500">{message.organizationName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs capitalize ${getPriorityColor(
                            message.priority
                          )}`}
                        >
                          {message.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs capitalize ${statusBadge.color}`}
                        >
                          {statusBadge.icon}
                          {message.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {message.submittedAt ? new Date(message.submittedAt).toLocaleDateString() : 'N/A'}
                          </p>
                          {message.submittedAt && (
                            <p className="text-xs text-gray-500">
                              {new Date(message.submittedAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(message)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {message.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(message.id)}
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Reason for rejection:');
                                  if (reason) handleReject(message.id, reason);
                                }}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Message Details Modal */}
      {showDetailsModal && selectedMessage && (
        <MessageDetailsModal
          message={selectedMessage}
          onClose={() => setShowDetailsModal(false)}
          onApprove={() => {
            handleApprove(selectedMessage.id);
            setShowDetailsModal(false);
          }}
          onReject={(reason) => {
            handleReject(selectedMessage.id, reason);
            setShowDetailsModal(false);
          }}
        />
      )}
    </div>
  );
}

// Message Details Modal
function MessageDetailsModal({
  message,
  onClose,
  onApprove,
  onReject,
}: {
  message: PendingMessage;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-xl text-gray-900 dark:text-white">Message Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Message Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Message Type</p>
              <p className="text-sm text-gray-900 dark:text-white capitalize">
                {message.messageType || 'text'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Category</p>
              <p className="text-sm text-gray-900 dark:text-white capitalize">
                {message.category || 'N/A'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Priority</p>
              <p className="text-sm text-gray-900 dark:text-white capitalize">
                {message.priority}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Estimated Cost</p>
              <p className="text-sm text-gray-900 dark:text-white">
                ${(message.estimatedCost || 0).toFixed(3)}
              </p>
            </div>
          </div>

          {/* Recipient Info */}
          <div>
            <h3 className="text-sm text-gray-900 dark:text-white mb-3">Recipient Information</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Name:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {message.recipientName || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {message.channel === 'email' ? 'Email:' : message.channel === 'fcm' ? 'FCM Token:' : 'Phone:'}
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {message.recipient}
                </span>
              </div>
              {message.channel && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Channel:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                    message.channel === 'whatsapp'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                      : message.channel === 'sms'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                      : message.channel === 'email'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                  }`}>
                    {message.channel === 'whatsapp' ? (
                      <MessageCircle className="w-3 h-3" />
                    ) : message.channel === 'sms' ? (
                      <Smartphone className="w-3 h-3" />
                    ) : message.channel === 'email' ? (
                      <Mail className="w-3 h-3" />
                    ) : (
                      <Bell className="w-3 h-3" />
                    )}
                    {message.channel.toUpperCase()}
                  </span>
                </div>
              )}
              {message.isBulkMessage && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Bulk Size:</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {message.bulkSize} recipients
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Message Content */}
          <div>
            <h3 className="text-sm text-gray-900 dark:text-white mb-3">Message Content</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              {message.templateName && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                  Template: {message.templateName}
                </p>
              )}
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {message.messageContent || message.content || 'No content'}
              </p>
              {message.mediaUrl && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Media:</p>
                  <a
                    href={message.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View attached media
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Submitter Info */}
          <div>
            <h3 className="text-sm text-gray-900 dark:text-white mb-3">Submission Details</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Submitted By:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {message.submittedByName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Organization:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {message.organizationName || 'Current Organization'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Submitted At:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {message.submittedAt ? new Date(message.submittedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              {message.scheduledFor && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Scheduled For:</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(message.scheduledFor).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Expires At:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {message.expiresAt ? new Date(message.expiresAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Rejection Form */}
          {showRejectForm && (
            <div>
              <h3 className="text-sm text-gray-900 dark:text-white mb-3">Rejection Reason</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Please provide a reason for rejection..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          {message.status === 'pending' ? (
            <>
              {showRejectForm ? (
                <>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onReject(rejectionReason)}
                    disabled={!rejectionReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Rejection
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={onApprove}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Send
                  </button>
                </>
              )}
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
