import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit, MessageSquare, Trash2, FileText, MessageCircle, Smartphone, Filter, Copy, MoreVertical, Mail, Bell, CheckCircle, XCircle, Send, Clock, Upload, Download, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeInput } from '../../utils/security';
import { apiService } from '../../utils/api';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Pagination } from '../shared/Pagination';
import { TemplatePreviewModal } from './TemplatePreviewModal';

interface TemplatesProps {
  // Optional callback overrides — kept for callers that don't go through React Router.
  // When unset, the component uses useNavigate() directly.
  onNavigateToCreate?: () => void;
  onNavigateToEdit?: (templateId: number) => void;
}

type Channel = 'all' | 'whatsapp' | 'sms' | 'email' | 'fcm';
type StatFilter = 'all' | 'whatsapp' | 'sms' | 'email' | 'fcm' | 'approved' | 'pending';

interface Template {
  id: number;
  name: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'fcm';
  category: string;
  language: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  type: string;
  content: string;
  variables: string[];
  createdAt: string;
  usageCount: number;
}

export function Templates({ onNavigateToCreate, onNavigateToEdit }: TemplatesProps) {
  const navigate = useNavigate();
  const goCreate = onNavigateToCreate || (() => navigate('/templates/new'));
  const goEdit = onNavigateToEdit || ((id: number | string) => navigate(`/templates/${id}/edit`));
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<Channel>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>('all');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;
  const [showImportModal, setShowImportModal] = useState(false);
  const [importChannel, setImportChannel] = useState<'sms' | 'whatsapp' | 'email' | 'fcm' | ''>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({ skipDuplicates: true, updateExisting: false });
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);

  // Pull the latest WhatsApp templates from Meta into the local DB. The
  // background scheduler also does this every 15 min, but the button gives
  // an instant refresh after creating/approving a template in Meta.
  const handleSyncFromMeta = async () => {
    setSyncing(true);
    try {
      const r = await apiService.templates.syncFromMeta();
      if (r?.success) {
        const d = r.data || {};
        toast.success(r.message || 'Templates synced', {
          description: `New: ${d.inserted || 0} • Updated: ${d.updated || 0} • Skipped: ${d.skipped || 0}`,
        });
        await refreshTemplates();
      } else {
        toast.error('Sync failed', { description: r?.error?.message || 'Unknown error' });
      }
    } catch (e: any) {
      toast.error('Sync failed', {
        description: e.response?.data?.error?.message || e.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  // Fetch templates from API
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (!currentOrganization) return;

    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const response = await apiService.templates.list({ page: currentPage, limit: recordsPerPage });
        if (response.success && response.data) {
          const templatesData = response.data.templates || response.data;
          setTemplates(templatesData.map((template: any) => ({
            id: template.id,
            name: template.name || 'Unnamed Template',
            channel: template.channel || 'whatsapp',
            category: template.category || 'transactional',
            content: template.body || template.htmlBody || template.plainTextBody || '',
            status: template.status || 'draft',
            whatsappStatus: template.whatsappStatus || null,
            whatsappRejectionReason: template.whatsappRejectionReason || template.rejectionReason || null,
            whatsappTemplateId: template.whatsappTemplateId || null,
            variables: Array.isArray(template.variables) ? template.variables : [],
            language: template.language || 'en',
            type: template.type || 'text',
            usageCount: template.usageCount || template.totalSent || 0,
            createdAt: template.createdAt || new Date().toISOString(),
            updatedAt: template.updatedAt || template.createdAt || new Date().toISOString(),
            subject: template.subject, // For email/FCM
            htmlBody: template.htmlBody, // For email
            plainTextBody: template.plainTextBody, // For email
          })));
          
          // Extract pagination metadata
          if (response.data.pagination) {
            setTotalPages(response.data.pagination.totalPages || 1);
            setTotalRecords(response.data.pagination.total || 0);
          } else {
            setTotalPages(1);
            setTotalRecords(templatesData.length);
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch templates:', error);
        toast.error('Failed to load templates', {
          description: error.response?.data?.error?.message || error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [currentOrganization?.id, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeInput(e.target.value, 100);
    setSearchQuery(sanitized);
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = channelFilter === 'all' || template.channel === channelFilter;
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    let matchesStatus = statusFilter === 'all';
    if (statusFilter === 'pending') {
      matchesStatus = template.status === 'pending_approval' || template.status === 'draft';
    } else if (statusFilter !== 'all') {
      matchesStatus = template.status === statusFilter;
    }

    // Apply stat card filter
    let matchesStatFilter = true;
    if (activeStatFilter === 'whatsapp') {
      matchesStatFilter = template.channel === 'whatsapp';
    } else if (activeStatFilter === 'sms') {
      matchesStatFilter = template.channel === 'sms';
    } else if (activeStatFilter === 'email') {
      matchesStatFilter = template.channel === 'email';
    } else if (activeStatFilter === 'fcm') {
      matchesStatFilter = template.channel === 'fcm';
    } else if (activeStatFilter === 'approved') {
      matchesStatFilter = template.status === 'approved';
    } else if (activeStatFilter === 'pending') {
      matchesStatFilter = template.status === 'pending_approval' || template.status === 'draft';
    }

    return matchesSearch && matchesChannel && matchesCategory && matchesStatus && matchesStatFilter;
  });

  const stats = {
    total: templates.length,
    whatsapp: templates.filter(t => t.channel === 'whatsapp').length,
    sms: templates.filter(t => t.channel === 'sms').length,
    email: templates.filter(t => t.channel === 'email').length,
    fcm: templates.filter(t => t.channel === 'fcm').length,
    approved: templates.filter(t => t.status === 'approved').length,
    pending: templates.filter(t => t.status === 'pending_approval' || t.status === 'draft').length,
  };

  // Helper function to refresh templates list
  const refreshTemplates = async () => {
    try {
      const response = await apiService.templates.list({ page: 1, limit: 100 });
      if (response.success && response.data) {
        const templatesData = response.data.templates || response.data;
        setTemplates(templatesData.map((template: any) => ({
          id: template.id,
          name: template.name || 'Unnamed Template',
          channel: template.channel || 'whatsapp',
          category: template.category || 'transactional',
          content: template.body || template.htmlBody || template.plainTextBody || '',
          status: template.status || 'draft',
          variables: Array.isArray(template.variables) ? template.variables : [],
          language: template.language || 'en',
          type: template.type || 'text',
          usageCount: template.usageCount || template.totalSent || 0,
          createdAt: template.createdAt || new Date().toISOString(),
          updatedAt: template.updatedAt || template.createdAt || new Date().toISOString(),
          subject: template.subject,
          htmlBody: template.htmlBody,
          plainTextBody: template.plainTextBody,
        })));
      }
    } catch (error: any) {
      console.error('Failed to refresh templates:', error);
    }
  };

  const handleSubmitForApproval = async (templateId: number) => {
    try {
      const tpl = templates.find((t) => t.id === templateId);
      const response = await apiService.templates.submitForApproval(templateId.toString());
      if (response.success) {
        if (tpl?.channel === 'whatsapp') {
          toast.success('Submitted to Meta for review', {
            description: "Status will update automatically when Meta approves or rejects (usually within a few minutes).",
          });
        } else {
          toast.success('Template submitted for approval');
        }
        await refreshTemplates();
      } else {
        toast.error('Failed to submit template', {
          description: response.error?.message || 'An unknown error occurred',
        });
      }
    } catch (error: any) {
      toast.error('Failed to submit template', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleApprove = async (templateId: number) => {
    try {
      const response = await apiService.templates.approve(templateId.toString());
      if (response.success) {
        toast.success('Template approved successfully');
        await refreshTemplates();
      } else {
        toast.error('Failed to approve template', {
          description: response.error?.message || 'An unknown error occurred',
        });
      }
    } catch (error: any) {
      toast.error('Failed to approve template', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleReject = async (templateId: number) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await apiService.templates.reject(templateId.toString(), reason);
      if (response.success) {
        toast.success('Template rejected');
        await refreshTemplates();
      } else {
        toast.error('Failed to reject template', {
          description: response.error?.message || 'An unknown error occurred',
        });
      }
    } catch (error: any) {
      toast.error('Failed to reject template', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleDuplicate = async (templateId: number) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      const response = await apiService.templates.create({
        name: `${template.name} (Copy)`,
        channel: template.channel,
        category: template.category,
        body: template.content,
        variables: template.variables,
      });

      if (response.success) {
        toast.success('Template duplicated successfully');
        await refreshTemplates();
      }
    } catch (error: any) {
      toast.error('Failed to duplicate template', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiService.templates.delete(templateId.toString());
      if (response.success) {
        toast.success('Template deleted successfully');
        await refreshTemplates();
      }
    } catch (error: any) {
      toast.error('Failed to delete template', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleImport = () => {
    setShowImportModal(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const filters: any = {};
      if (channelFilter !== 'all') filters.channel = channelFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (categoryFilter !== 'all') filters.category = categoryFilter;

      const blob = await apiService.templates.export(filters);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const channelSuffix = channelFilter !== 'all' ? `_${channelFilter}` : '';
      link.setAttribute('download', `Templates_Export${channelSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Templates exported successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error('Failed to export templates', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async (channel: 'sms' | 'whatsapp' | 'email' | 'fcm') => {
    try {
      const blob = await apiService.templates.downloadTemplate(channel);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_import_template_${channel}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to download template', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        toast.error('Invalid file type', {
          description: 'Please upload a CSV or Excel file',
        });
        return;
      }
      setImportFile(file);
    }
  };

  const handleSubmitImport = async () => {
    if (!importFile || !importChannel) {
      toast.error('Please select a file and channel');
      return;
    }

    setImporting(true);
    try {
      const response = await apiService.templates.import(importFile, importChannel, importOptions);
      if (response.success) {
        toast.success('Import completed successfully', {
          description: `Successfully imported ${response.data?.successfulImports || 0} templates. ${response.data?.failedImports || 0} failed, ${response.data?.duplicateTemplates || 0} duplicates.`,
        });
        setShowImportModal(false);
        setImportFile(null);
        setImportChannel('');
        // Refresh templates list after a delay
        setTimeout(() => {
          refreshTemplates();
        }, 1000);
      }
    } catch (error: any) {
      toast.error('Failed to import templates', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="colorful p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Message Templates</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage WhatsApp and SMS message templates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            onClick={handleSyncFromMeta}
            disabled={syncing}
            title="Pull latest WhatsApp templates from Meta. Runs automatically every 15 minutes."
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Refresh from Meta'}
          </button>
          <button
            onClick={() => goCreate()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Stats Cards */}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Templates</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
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
          onClick={() => setActiveStatFilter('approved')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'approved'
              ? 'border-green-500 ring-2 ring-green-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
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
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates by name or content..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Channel Filter */}
          <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                channelFilter === 'all'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setChannelFilter('whatsapp')}
              className={`px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 ${
                channelFilter === 'whatsapp'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={() => setChannelFilter('sms')}
              className={`px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 ${
                channelFilter === 'sms'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              SMS
            </button>
            <button
              onClick={() => setChannelFilter('email')}
              className={`px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 ${
                channelFilter === 'email'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => setChannelFilter('fcm')}
              className={`px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 ${
                channelFilter === 'fcm'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Bell className="w-4 h-4" />
              FCM
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="Marketing">Marketing</option>
            <option value="Transactional">Transactional</option>
            <option value="Utility">Utility</option>
            <option value="Authentication">Authentication</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No templates found matching your filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{template.name}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {template.content}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {template.channel === 'whatsapp' ? (
                          <>
                            <MessageCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-900 dark:text-white">WhatsApp</span>
                          </>
                        ) : template.channel === 'sms' ? (
                          <>
                            <Smartphone className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-900 dark:text-white">SMS</span>
                          </>
                        ) : template.channel === 'email' ? (
                          <>
                            <Mail className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-gray-900 dark:text-white">Email</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 text-orange-600" />
                            <span className="text-sm text-gray-900 dark:text-white">FCM</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {template.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">{template.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                          template.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : template.status === 'pending_approval'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                            : template.status === 'draft'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                            : template.status === 'rejected'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                        }`}
                        title={template.status === 'rejected' && template.whatsappRejectionReason ? template.whatsappRejectionReason : undefined}
                      >
                        {template.channel === 'whatsapp' && template.status === 'pending_approval'
                          ? 'Awaiting Meta'
                          : template.status === 'pending_approval'
                          ? 'Pending'
                          : template.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {template.usageCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {template.createdAt}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Submit for Approval (Draft only) */}
                        {template.status === 'draft' && (
                          <button
                            onClick={() => handleSubmitForApproval(template.id)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Submit for Approval"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        
                        {/* Approve (Pending Approval only — and only for non-WhatsApp channels; WhatsApp approval is owned by Meta and arrives via webhook) */}
                        {template.status === 'pending_approval' && template.channel !== 'whatsapp' && (
                          <button
                            onClick={() => handleApprove(template.id)}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reject (Pending Approval only — and only for non-WhatsApp channels) */}
                        {template.status === 'pending_approval' && template.channel !== 'whatsapp' && (
                          <button
                            onClick={() => handleReject(template.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => setPreviewId(template.id)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => goEdit(template.id)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(template.id)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-gray-900 dark:text-white">Import Templates</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportChannel('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Channel *
                </label>
                <select
                  value={importChannel}
                  onChange={(e) => setImportChannel(e.target.value as 'sms' | 'whatsapp' | 'email' | 'fcm' | '')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select channel...</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="fcm">FCM</option>
                </select>
              </div>

              {importChannel && (
                <div>
                  <button
                    onClick={() => handleDownloadTemplate(importChannel as 'sms' | 'whatsapp' | 'email' | 'fcm')}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download {importChannel.toUpperCase()} Template
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select File (CSV or Excel) *
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                {importFile && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={importOptions.skipDuplicates}
                    onChange={(e) => setImportOptions({ ...importOptions, skipDuplicates: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Skip duplicate templates</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={importOptions.updateExisting}
                    onChange={(e) => setImportOptions({ ...importOptions, updateExisting: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Update existing templates</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportChannel('');
                  }}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitImport}
                  disabled={!importFile || !importChannel || importing}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewId !== null && (
        <TemplatePreviewModal
          templateId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}