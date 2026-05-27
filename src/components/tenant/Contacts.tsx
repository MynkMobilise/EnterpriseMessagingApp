import { useState, useEffect } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Mail,
  Building2,
  Tag,
  UserPlus,
  X,
  Save,
  Star,
  MessageCircle,
  Smartphone,
  Calendar,
  MapPin,
  Briefcase,
  Info,
  AlertCircle,
  CheckCircle,
  Users,
  Database,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeInput, validateEmail, validatePhone } from '../../utils/security';
import { apiService } from '../../utils/api';
import { Pagination } from '../shared/Pagination';

interface Contact {
  id: number;
  name: string;
  phone: string;
  email: string;
  organization: string;
  tags: string[];
  productsInterest: string[];
  source: string;
  assignedTo: string;
  status: 'active' | 'inactive' | 'blocked';
  lastContact: string;
  totalMessages: number;
  whatsappOptIn: boolean;
  smsOptIn: boolean;
  country: string;
  city: string;
  jobTitle: string;
  notes: string;
  createdAt: string;
  // HRMS-synced fields (populated when contact came from HRMS API/Excel).
  employeeId?: string;
  designation?: string;
  department?: string;
  costCenterName?: string;
  region?: string;
}

export function Contacts() {
  const { currentOrganization } = useOrganization();
  const { hasFeature } = useAuth();
  const [showAddContact, setShowAddContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [activeStatFilter, setActiveStatFilter] = useState<'all' | 'active' | 'whatsapp' | 'sms'>('all');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({ skipDuplicates: true, updateExisting: false });
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  // HRMS sync state — modal + saved-config snapshot + form draft.
  const [showHrmsModal, setShowHrmsModal] = useState(false);
  const [hrmsConfig, setHrmsConfig] = useState<{
    hrmsApiUrl: string;
    hrmsApiAuthHeaderName: string;
    hrmsApiAuthHeaderValueSet: boolean;
    hrmsLastSyncDatetime: string | null;
    hrmsLastSyncedCount: number;
    hrmsLastSyncedAt: string | null;
    hrmsLastSyncError: string | null;
  } | null>(null);
  const [hrmsForm, setHrmsForm] = useState({
    hrmsApiUrl: '',
    hrmsApiAuthHeaderName: '',
    hrmsApiAuthHeaderValue: '',
  });
  const [hrmsSaving, setHrmsSaving] = useState(false);
  const [hrmsSyncing, setHrmsSyncing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    organization: '',
    tags: [] as string[],
    productsInterest: [] as string[],
    source: 'Manual',
    assignedTo: '',
    status: 'active' as 'active' | 'inactive' | 'blocked',
    whatsappOptIn: true,
    smsOptIn: true,
    country: '',
    city: '',
    jobTitle: '',
    notes: '',
  });

  // Fetch contacts from API
  useEffect(() => {
    if (!currentOrganization) return;

    const fetchContacts = async () => {
      setLoading(true);
      try {
        const response = await apiService.contacts.list({ page: currentPage, limit: recordsPerPage });
        if (response.success && response.data) {
          // Transform API response to component format
          const contactsData = response.data.contacts || response.data;
          setContacts(contactsData.map((contact: any) => ({
            id: contact.id,
            name: contact.name || 'Unknown',
            phone: contact.phoneNumber || '',
            email: contact.email || '',
            // For HRMS-synced contacts, fall back to cost-center name for the
            // "Organization" column so the table isn't a sea of blanks.
            organization: contact.company || contact.costCenterName || '',
            tags: contact.tags || [],
            productsInterest: contact.customFields?.productsInterest || [],
            source: contact.source || 'Manual',
            assignedTo: contact.assignedTo || '',
            status: contact.status || 'active',
            whatsappOptIn: contact.optInStatus === 'opted_in' || contact.whatsappVerified || false,
            smsOptIn: contact.optInStatus === 'opted_in' || false,
            country: contact.country || '',
            city: contact.city || '',
            jobTitle: contact.jobTitle || contact.designation || '',
            notes: contact.notes || '',
            lastContact: contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleDateString() : 'Never',
            totalMessages: (contact.totalMessagesSent || 0) + (contact.totalMessagesReceived || 0),
            createdAt: contact.createdAt || new Date().toISOString(),
            // HRMS-specific (raw, for display in the row sub-line).
            employeeId: contact.employeeId || '',
            designation: contact.designation || '',
            department: contact.department || '',
            costCenterName: contact.costCenterName || '',
            region: contact.region || '',
          })));
          
          // Extract pagination metadata
          if (response.data.pagination) {
            setTotalPages(response.data.pagination.totalPages || 1);
            setTotalRecords(response.data.pagination.total || 0);
          } else {
            setTotalPages(1);
            setTotalRecords(contactsData.length);
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch contacts:', error);
        toast.error('Failed to load contacts', {
          description: error.response?.data?.error?.message || error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentOrganization?.id, currentPage]);

  // Reset to page 1 whenever the user changes a filter / search — otherwise
  // they can end up on page 5 with zero matches just because the page they
  // were viewing has no rows that match the new query.
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, tagFilter, statusFilter, activeStatFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeInput(e.target.value, 100);
    setSearchQuery(sanitized);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Name validation
    const sanitizedName = sanitizeInput(formData.name, 100);
    if (!sanitizedName || sanitizedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Phone validation
    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (e.g., +1234567890)';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddContact = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const contactData = {
        name: sanitizeInput(formData.name, 100),
        phoneNumber: formData.phone,
        email: formData.email || undefined,
        organization: formData.organization || undefined,
        tags: formData.tags,
        productsInterest: formData.productsInterest,
        source: formData.source,
        assignedTo: formData.assignedTo || undefined,
        status: formData.status,
        whatsappOptIn: formData.whatsappOptIn,
        smsOptIn: formData.smsOptIn,
        country: formData.country || undefined,
        city: formData.city || undefined,
        jobTitle: formData.jobTitle || undefined,
        notes: formData.notes || undefined,
      };

      const response = await apiService.contacts.create(contactData);
      if (response.success) {
        toast.success('Contact added successfully');
        setShowAddContact(false);
        resetForm();
        // Refresh contacts list
        const refreshResponse = await apiService.contacts.list({ page: 1, limit: 100 });
        if (refreshResponse.success && refreshResponse.data) {
          const contactsData = refreshResponse.data.contacts || refreshResponse.data;
          setContacts(contactsData.map((contact: any) => ({
            id: contact.id,
            name: contact.name || 'Unknown',
            phone: contact.phoneNumber || '',
            email: contact.email || '',
            // For HRMS-synced contacts, fall back to cost-center name for the
            // "Organization" column so the table isn't a sea of blanks.
            organization: contact.company || contact.costCenterName || '',
            tags: contact.tags || [],
            productsInterest: contact.customFields?.productsInterest || [],
            source: contact.source || 'Manual',
            assignedTo: contact.assignedTo || '',
            status: contact.status || 'active',
            whatsappOptIn: contact.optInStatus === 'opted_in' || contact.whatsappVerified || false,
            smsOptIn: contact.optInStatus === 'opted_in' || false,
            country: contact.country || '',
            city: contact.city || '',
            jobTitle: contact.jobTitle || contact.designation || '',
            notes: contact.notes || '',
            lastContact: contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleDateString() : 'Never',
            totalMessages: (contact.totalMessagesSent || 0) + (contact.totalMessagesReceived || 0),
            createdAt: contact.createdAt || new Date().toISOString(),
            // HRMS-specific (raw, for display in the row sub-line).
            employeeId: contact.employeeId || '',
            designation: contact.designation || '',
            department: contact.department || '',
            costCenterName: contact.costCenterName || '',
            region: contact.region || '',
          })));
        }
      }
    } catch (error: any) {
      toast.error('Failed to add contact', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleUpdateContact = async () => {
    if (!validateForm() || !editingContact) {
      return;
    }

    try {
      const contactData = {
        name: sanitizeInput(formData.name, 100),
        phoneNumber: formData.phone,
        email: formData.email || null,
        company: formData.organization || null,
        tags: formData.tags,
        productsInterest: formData.productsInterest,
        source: formData.source,
        assignedTo: formData.assignedTo || null,
        status: formData.status,
        whatsappOptIn: formData.whatsappOptIn,
        smsOptIn: formData.smsOptIn,
        country: formData.country || null,
        city: formData.city || null,
        jobTitle: formData.jobTitle || null,
        notes: formData.notes || null,
      };

      const response = await apiService.contacts.update(editingContact.id.toString(), contactData);
      if (response.success) {
        toast.success('Contact updated successfully');
        setEditingContact(null);
        resetForm();
        // Refresh contacts list
        const refreshResponse = await apiService.contacts.list({ page: 1, limit: 100 });
        if (refreshResponse.success && refreshResponse.data) {
          const contactsData = refreshResponse.data.contacts || refreshResponse.data;
          setContacts(contactsData.map((contact: any) => ({
            id: contact.id,
            name: contact.name || 'Unknown',
            phone: contact.phoneNumber || '',
            email: contact.email || '',
            // For HRMS-synced contacts, fall back to cost-center name for the
            // "Organization" column so the table isn't a sea of blanks.
            organization: contact.company || contact.costCenterName || '',
            tags: contact.tags || [],
            productsInterest: contact.customFields?.productsInterest || [],
            source: contact.source || 'Manual',
            assignedTo: contact.assignedTo || '',
            status: contact.status || 'active',
            whatsappOptIn: contact.optInStatus === 'opted_in' || contact.whatsappVerified || false,
            smsOptIn: contact.optInStatus === 'opted_in' || false,
            country: contact.country || '',
            city: contact.city || '',
            jobTitle: contact.jobTitle || contact.designation || '',
            notes: contact.notes || '',
            lastContact: contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleDateString() : 'Never',
            totalMessages: (contact.totalMessagesSent || 0) + (contact.totalMessagesReceived || 0),
            createdAt: contact.createdAt || new Date().toISOString(),
            // HRMS-specific (raw, for display in the row sub-line).
            employeeId: contact.employeeId || '',
            designation: contact.designation || '',
            department: contact.department || '',
            costCenterName: contact.costCenterName || '',
            region: contact.region || '',
          })));
        }
      }
    } catch (error: any) {
      toast.error('Failed to update contact', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      organization: '',
      tags: [],
      productsInterest: [],
      source: 'Manual',
      assignedTo: '',
      status: 'active',
      whatsappOptIn: true,
      smsOptIn: true,
      country: '',
      city: '',
      jobTitle: '',
      notes: '',
    });
  };

  const handleEditContact = (contact: Contact) => {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      organization: contact.organization,
      tags: contact.tags,
      productsInterest: contact.productsInterest,
      source: contact.source,
      assignedTo: contact.assignedTo,
      status: contact.status,
      whatsappOptIn: contact.whatsappOptIn,
      smsOptIn: contact.smsOptIn,
      country: contact.country,
      city: contact.city,
      jobTitle: contact.jobTitle,
      notes: contact.notes,
    });
    setEditingContact(contact);
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      const response = await apiService.contacts.delete(contactId.toString());
      if (response.success) {
        toast.success('Contact deleted successfully');
        // Refresh contacts list
        const refreshResponse = await apiService.contacts.list({ page: 1, limit: 100 });
        if (refreshResponse.success && refreshResponse.data) {
          const contactsData = refreshResponse.data.contacts || refreshResponse.data;
          setContacts(contactsData.map((contact: any) => ({
            id: contact.id,
            name: contact.name || 'Unknown',
            phone: contact.phoneNumber || '',
            email: contact.email || '',
            // For HRMS-synced contacts, fall back to cost-center name for the
            // "Organization" column so the table isn't a sea of blanks.
            organization: contact.company || contact.costCenterName || '',
            tags: contact.tags || [],
            productsInterest: contact.customFields?.productsInterest || [],
            source: contact.source || 'Manual',
            assignedTo: contact.assignedTo || '',
            status: contact.status || 'active',
            whatsappOptIn: contact.optInStatus === 'opted_in' || contact.whatsappVerified || false,
            smsOptIn: contact.optInStatus === 'opted_in' || false,
            country: contact.country || '',
            city: contact.city || '',
            jobTitle: contact.jobTitle || contact.designation || '',
            notes: contact.notes || '',
            lastContact: contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleDateString() : 'Never',
            totalMessages: (contact.totalMessagesSent || 0) + (contact.totalMessagesReceived || 0),
            createdAt: contact.createdAt || new Date().toISOString(),
            // HRMS-specific (raw, for display in the row sub-line).
            employeeId: contact.employeeId || '',
            designation: contact.designation || '',
            department: contact.department || '',
            costCenterName: contact.costCenterName || '',
            region: contact.region || '',
          })));
        }
      }
    } catch (error: any) {
      toast.error('Failed to delete contact', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleBulkDelete = () => {
    if (selectedContacts.length === 0) {
      toast.error('No contacts selected');
      return;
    }
    toast.success(`${selectedContacts.length} contacts deleted`);
    setSelectedContacts([]);
  };

  const openHrmsModal = async () => {
    setShowHrmsModal(true);
    try {
      const r = await apiService.contacts.hrms.getConfig();
      if (r?.success) {
        setHrmsConfig(r.data);
        setHrmsForm({
          hrmsApiUrl: r.data.hrmsApiUrl || '',
          hrmsApiAuthHeaderName: r.data.hrmsApiAuthHeaderName || '',
          hrmsApiAuthHeaderValue: '', // never echoed back
        });
      }
    } catch (e: any) {
      toast.error('Failed to load HRMS config', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    }
  };

  const handleHrmsSaveConfig = async () => {
    if (!hrmsForm.hrmsApiUrl.trim()) {
      toast.error('API URL is required');
      return;
    }
    setHrmsSaving(true);
    try {
      const r = await apiService.contacts.hrms.saveConfig({
        hrmsApiUrl: hrmsForm.hrmsApiUrl.trim(),
        hrmsApiAuthHeaderName: hrmsForm.hrmsApiAuthHeaderName.trim() || undefined,
        hrmsApiAuthHeaderValue: hrmsForm.hrmsApiAuthHeaderValue.trim() || undefined,
      });
      if (r?.success) {
        toast.success('HRMS configuration saved');
        // Reload config to reflect the now-set state
        const fresh = await apiService.contacts.hrms.getConfig();
        if (fresh?.success) setHrmsConfig(fresh.data);
        setHrmsForm((f) => ({ ...f, hrmsApiAuthHeaderValue: '' })); // wipe sensitive field
      }
    } catch (e: any) {
      toast.error('Failed to save HRMS config', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setHrmsSaving(false);
    }
  };

  const handleHrmsSyncNow = async () => {
    setHrmsSyncing(true);
    try {
      const r = await apiService.contacts.hrms.syncNow();
      if (r?.success) {
        toast.success('HRMS sync complete', {
          description: r.message,
        });
        // Reload config to show updated last_synced_at + count
        const fresh = await apiService.contacts.hrms.getConfig();
        if (fresh?.success) setHrmsConfig(fresh.data);
        // Refresh contacts list to show newly-synced rows
        fetchContacts();
      } else {
        toast.error('Sync failed', {
          description: r?.error?.message,
        });
      }
    } catch (e: any) {
      toast.error('Sync failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setHrmsSyncing(false);
    }
  };

  const handleHrmsDownloadTemplate = async () => {
    try {
      const blob = await apiService.contacts.hrms.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hrms-contacts-template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      if (tagFilter !== 'all') filters.tags = tagFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;

      const blob = await apiService.contacts.export(filters);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Contacts_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Contacts exported successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error('Failed to export contacts', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    setShowImportModal(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apiService.contacts.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contact_import_template.csv');
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
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }

    setImporting(true);
    try {
      const response = await apiService.contacts.import(importFile, importOptions);
      if (response.success) {
        toast.success('Import started successfully', {
          description: 'Your contacts are being imported. This may take a few moments.',
        });
        setShowImportModal(false);
        setImportFile(null);
        // Refresh contacts list after a delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      toast.error('Failed to import contacts', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const toggleProduct = (product: string) => {
    setFormData((prev) => ({
      ...prev,
      productsInterest: prev.productsInterest.includes(product)
        ? prev.productsInterest.filter((p) => p !== product)
        : [...prev.productsInterest, product],
    }));
  };

  const toggleSelectContact = (contactId: number) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedContacts(
      selectedContacts.length === filteredContacts.length
        ? []
        : filteredContacts.map((c) => c.id)
    );
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      contact.organization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = tagFilter === 'all' || contact.tags.includes(tagFilter);
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;

    // Apply stat card filter
    let matchesStatFilter = true;
    if (activeStatFilter === 'active') {
      matchesStatFilter = contact.status === 'active';
    } else if (activeStatFilter === 'whatsapp') {
      matchesStatFilter = contact.whatsappOptIn;
    } else if (activeStatFilter === 'sms') {
      matchesStatFilter = contact.smsOptIn;
    }

    return matchesSearch && matchesTag && matchesStatus && matchesStatFilter;
  });

  // Stats: `total` is the authoritative server-side count from the pagination
  // metadata so the dashboard card stays correct as the user pages. The other
  // three counts are page-scoped because the API doesn't expose org-wide opt-in
  // / status aggregates yet — surfaced as approximations on the visible page.
  const stats = {
    total: totalRecords,
    active: contacts.filter((c) => c.status === 'active').length,
    whatsapp: contacts.filter((c) => c.whatsappOptIn).length,
    sms: contacts.filter((c) => c.smsOptIn).length,
  };

  const availableTags = [
    'VIP',
    'Enterprise',
    'Hot Lead',
    'Prospect',
    'Partner',
    'Customer',
    'Trial',
  ];

  const availableProducts = [
    'WhatsApp API',
    'SMS Gateway',
    'Templates',
    'Integration Services',
    'Analytics',
  ];

  return (
    <div className="colorful p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Contact Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage and organize your customer contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* HRMS sync is a paid-tier feature; hide the button when the tenant
              doesn't have the hrmsSync feature flag. Backend also 403s the
              /contacts/hrms/* endpoints in that case. */}
          {hasFeature('hrmsSync') && (
            <button
              onClick={openHrmsModal}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              title="Sync contacts from an external HRMS API"
            >
              <Database className="w-4 h-4" />
              HRMS Sync
            </button>
          )}
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
            onClick={() => setShowAddContact(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Contacts</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatFilter('active')}
          className={`bg-white dark:bg-gray-900 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
            activeStatFilter === 'active'
              ? 'border-green-500 ring-2 ring-green-500/20'
              : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Contacts</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
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
              <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp Opt-In</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">SMS Opt-In</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.sms}</p>
            </div>
            <Smartphone className="w-8 h-8 text-blue-600" />
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
              placeholder="Search by name, email, phone, or organization..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Tag Filter */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>

          {/* Bulk Actions */}
          {selectedContacts.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedContacts.length})
            </button>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      filteredContacts.length > 0 &&
                      selectedContacts.length === filteredContacts.length
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Channel Opt-In
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Last Contact
                </th>
                <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No contacts found matching your filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleSelectContact(contact.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-900 dark:text-white">{contact.name}</p>
                          {contact.employeeId && (
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 px-1.5 py-0.5 border border-gray-200 dark:border-gray-700 rounded">
                              {contact.employeeId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {contact.phone && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </span>
                          )}
                          {contact.email && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </span>
                          )}
                          {!contact.phone && !contact.email && (
                            <span className="text-xs text-gray-400 italic">No contact info</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {contact.organization || <span className="text-gray-400">—</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {[contact.jobTitle, contact.department, contact.region]
                            .filter(Boolean)
                            .join(' · ') || ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            contact.whatsappOptIn
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}
                        >
                          <MessageCircle className="w-3 h-3" />
                          WA
                        </div>
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            contact.smsOptIn
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}
                        >
                          <Smartphone className="w-3 h-3" />
                          SMS
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                          contact.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : contact.status === 'inactive'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}
                      >
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {contact.lastContact}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditContact(contact)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
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

      {/* Add/Edit Contact Modal */}
      {(showAddContact || editingContact) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl text-gray-900 dark:text-white">
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Enter contact information and preferences
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddContact(false);
                  setEditingContact(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1 555-0123"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="john.smith@example.com"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      placeholder="CTO"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => handleInputChange('organization', e.target.value)}
                      placeholder="Acme Corporation"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Source
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) => handleInputChange('source', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    >
                      <option>Manual</option>
                      <option>Website</option>
                      <option>Referral</option>
                      <option>Campaign</option>
                      <option>Partner</option>
                      <option>Trade Show</option>
                      <option>Import</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="United States"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="New York"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                        formData.tags.includes(tag)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products/Services Interest */}
              <div>
                <h3 className="text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Products / Services Interest
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableProducts.map((product) => (
                    <button
                      key={product}
                      onClick={() => toggleProduct(product)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                        formData.productsInterest.includes(product)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {product}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Preferences */}
              <div>
                <h3 className="text-base text-gray-900 dark:text-white mb-4">
                  Channel Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      id="whatsapp-opt"
                      checked={formData.whatsappOptIn}
                      onChange={(e) =>
                        handleInputChange('whatsappOptIn', e.target.checked)
                      }
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="whatsapp-opt" className="flex items-center gap-2 cursor-pointer">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-900 dark:text-white">WhatsApp Opt-In</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      id="sms-opt"
                      checked={formData.smsOptIn}
                      onChange={(e) => handleInputChange('smsOptIn', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sms-opt" className="flex items-center gap-2 cursor-pointer">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-900 dark:text-white">SMS Opt-In</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        handleInputChange('status', e.target.value as 'active' | 'inactive' | 'blocked')
                      }
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-base text-gray-900 dark:text-white mb-4">Notes</h3>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes or comments about this contact..."
                  rows={4}
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddContact(false);
                  setEditingContact(null);
                  resetForm();
                }}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingContact ? handleUpdateContact : handleAddContact}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingContact ? 'Update Contact' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-gray-900 dark:text-white">Import Contacts</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select File (CSV or Excel)
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

              <div>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={importOptions.skipDuplicates}
                    onChange={(e) => setImportOptions({ ...importOptions, skipDuplicates: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Skip duplicate contacts</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={importOptions.updateExisting}
                    onChange={(e) => setImportOptions({ ...importOptions, updateExisting: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Update existing contacts</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitImport}
                  disabled={!importFile || importing}
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

      {/* ----- HRMS modal: configure URL + auth + run sync + template ----- */}
      {showHrmsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowHrmsModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h3 className="text-lg text-gray-900 dark:text-white">HRMS Integration</h3>
              </div>
              <button
                onClick={() => setShowHrmsModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Status panel */}
              {hrmsConfig && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className="text-gray-900 dark:text-white">
                      {hrmsConfig.hrmsApiUrl ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last synced</span>
                    <span className="text-gray-900 dark:text-white">
                      {hrmsConfig.hrmsLastSyncedAt
                        ? new Date(hrmsConfig.hrmsLastSyncedAt).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Records in last sync</span>
                    <span className="text-gray-900 dark:text-white">
                      {hrmsConfig.hrmsLastSyncedCount || 0}
                    </span>
                  </div>
                  {hrmsConfig.hrmsLastSyncError && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 text-red-600 dark:text-red-400">
                      <span className="font-medium">Last error:</span>{' '}
                      {hrmsConfig.hrmsLastSyncError}
                    </div>
                  )}
                </div>
              )}

              {/* API config */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  API Endpoint
                </h4>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    HRMS API URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={hrmsForm.hrmsApiUrl}
                    onChange={(e) =>
                      setHrmsForm({ ...hrmsForm, hrmsApiUrl: e.target.value })
                    }
                    placeholder="https://hrms.example.com/api/export_user_data"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Endpoint receives <code>?limit=&amp;after_id=&amp;last_sync_datetime=</code>{' '}
                    and returns <code>{`{ success, data, next_empid, last_sync_datetime }`}</code>.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Auth header name <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={hrmsForm.hrmsApiAuthHeaderName}
                      onChange={(e) =>
                        setHrmsForm({ ...hrmsForm, hrmsApiAuthHeaderName: e.target.value })
                      }
                      placeholder="X-API-Key"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Auth header value{' '}
                      {hrmsConfig?.hrmsApiAuthHeaderValueSet && (
                        <span className="text-gray-400">(set — leave blank to keep)</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={hrmsForm.hrmsApiAuthHeaderValue}
                      onChange={(e) =>
                        setHrmsForm({ ...hrmsForm, hrmsApiAuthHeaderValue: e.target.value })
                      }
                      placeholder={hrmsConfig?.hrmsApiAuthHeaderValueSet ? '••••••••' : 'secret value'}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleHrmsSaveConfig}
                  disabled={hrmsSaving}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
                >
                  {hrmsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Configuration
                </button>
              </div>

              {/* Sync controls */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Sync &amp; Templates
                </h4>
                <p className="text-xs text-gray-500">
                  Manual sync pulls all new/updated employees from the URL above and upserts
                  them into Contacts. The cron runs the same job every 5 minutes automatically.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleHrmsSyncNow}
                    disabled={hrmsSyncing || !hrmsConfig?.hrmsApiUrl}
                    className="px-4 py-2 text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title={!hrmsConfig?.hrmsApiUrl ? 'Save an API URL first' : ''}
                  >
                    {hrmsSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync Now
                  </button>
                  <button
                    onClick={handleHrmsDownloadTemplate}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Excel Template
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  The Excel template uses the same column names as the API JSON keys, so a
                  payload can be dumped to Excel and re-imported losslessly via Import.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setShowHrmsModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
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