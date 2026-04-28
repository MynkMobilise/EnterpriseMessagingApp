import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Calendar,
  Activity,
  Users,
  X,
  Search,
  MoreVertical,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { useOrganization, Organization } from '../../contexts/OrganizationContext';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import { CompanyProfileSettings } from './settings/CompanyProfileSettings';

export function OrganizationManagement() {
  const { organizations, currentOrganization, addOrganization, updateOrganization, deleteOrganization, isLoading } =
    useOrganization();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [profileOrgId, setProfileOrgId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Debug: Log organizations data
  useEffect(() => {
    console.log('OrganizationManagement - organizations:', organizations);
    console.log('OrganizationManagement - isLoading:', isLoading);
    console.log('OrganizationManagement - currentOrganization:', currentOrganization);
  }, [organizations, isLoading, currentOrganization]);

  const handleEditOrg = (org: Organization) => {
    setSelectedOrg(org);
    setShowEditModal(true);
  };

  const handleViewProfile = (org: Organization) => {
    setProfileOrgId(org.id);
    setShowProfileModal(true);
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (organizations.length === 1) {
      toast.error('Cannot delete the only organization');
      return;
    }
    if (confirm('Are you sure you want to delete this organization?')) {
      try {
        await deleteOrganization(orgId);
        toast.success('Organization deleted successfully');
      } catch (error: any) {
        toast.error('Failed to delete organization', {
          description: error.response?.data?.error?.message || error.message,
        });
      }
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300';
      case 'professional':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      case 'starter':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'trial':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300';
      case 'suspended':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const filteredOrganizations = (organizations || []).filter((org) => {
    const matchesSearch =
      (org.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.industry || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || org.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || org.status === filterStatus;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const stats = {
    total: organizations?.length || 0,
    active: organizations?.filter((o) => o.status === 'active').length || 0,
    trial: organizations?.filter((o) => o.status === 'trial').length || 0,
    totalMessages: organizations?.reduce((sum, o) => sum + (o.usedMessages || 0), 0) || 0,
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-gray-400">Loading organizations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Organizations</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your organizations and switch between them
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Organization
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Organizations</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Trial</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.trial}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Messages</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">
                {stats.totalMessages.toLocaleString()}
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Current Organization Highlight */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            {currentOrganization?.logo ? (
              <img
                src={currentOrganization.logo}
                alt={currentOrganization.name}
                className="w-16 h-16 rounded-lg"
              />
            ) : (
              <Building2 className="w-8 h-8 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-base text-blue-900 dark:text-blue-100">Current Organization</h3>
              <span
                className={`text-xs px-3 py-1 rounded-full ${getPlanBadgeColor(
                  currentOrganization?.plan || 'free'
                )}`}
              >
                {currentOrganization?.plan}
              </span>
            </div>
            <p className="text-xl text-blue-900 dark:text-blue-100 mb-3">
              {currentOrganization?.name}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-700 dark:text-blue-300 text-xs">Message Quota</p>
                <p className="text-blue-900 dark:text-blue-100 text-sm">
                  {currentOrganization?.usedMessages.toLocaleString()} /{' '}
                  {currentOrganization?.messageQuota.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 text-xs">Status</p>
                <p className="text-blue-900 dark:text-blue-100 text-sm capitalize">
                  {currentOrganization?.status}
                </p>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 text-xs">Industry</p>
                <p className="text-blue-900 dark:text-blue-100 text-sm">
                  {currentOrganization?.industry}
                </p>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 text-xs">Created</p>
                <p className="text-blue-900 dark:text-blue-100 text-sm">
                  {new Date(currentOrganization?.createdAt || '').toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations by name or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Plan Filter */}
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Plans</option>
            <option value="enterprise">Enterprise</option>
            <option value="professional">Professional</option>
            <option value="starter">Starter</option>
            <option value="free">Free</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Users
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
              {filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No organizations found matching your filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((org) => (
                  <tr
                    key={org.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      org.id === currentOrganization?.id
                        ? 'bg-blue-50 dark:bg-blue-900/10'
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          {org.logo ? (
                            <img src={org.logo} alt={org.name} className="w-10 h-10 rounded-lg" />
                          ) : (
                            <Building2 className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-900 dark:text-white">{org.name}</p>
                            {org.id === currentOrganization?.id && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-600 text-white">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{org.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">{org.industry}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs capitalize ${getPlanBadgeColor(
                          org.plan
                        )}`}
                      >
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs capitalize ${getStatusBadge(
                          org.status
                        )}`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {org.usedMessages.toLocaleString()} / {org.messageQuota.toLocaleString()}
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              (org.usedMessages / org.messageQuota) * 100 > 80
                                ? 'bg-red-600'
                                : 'bg-blue-600'
                            }`}
                            style={{
                              width: `${Math.min(
                                (org.usedMessages / org.messageQuota) * 100,
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {org.userCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewProfile(org)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View Company Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditOrg(org)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrg(org.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                          disabled={org.id === currentOrganization?.id}
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

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <OrganizationModal
          isEdit={showEditModal}
          organization={selectedOrg}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedOrg(null);
          }}
          onSave={async (data) => {
            try {
              if (showEditModal && selectedOrg) {
                await updateOrganization(selectedOrg.id, data);
                toast.success('Organization updated successfully');
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedOrg(null);
              } else {
                await addOrganization(data);
                toast.success('Organization created successfully');
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedOrg(null);
              }
            } catch (error: any) {
              const errorMessage = error.response?.data?.error?.message || error.message || 'An unexpected error occurred';
              toast.error(showEditModal ? 'Failed to update organization' : 'Failed to create organization', {
                description: errorMessage,
              });
            }
          }}
        />
      )}

      {/* Company Profile Modal */}
      {showProfileModal && profileOrgId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <CompanyProfileSettings
                organizationId={profileOrgId}
                onClose={() => {
                  setShowProfileModal(false);
                  setProfileOrgId(null);
                }}
                isModal={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal component for Create/Edit
function OrganizationModal({
  isEdit,
  organization,
  onClose,
  onSave,
}: {
  isEdit: boolean;
  organization: Organization | null;
  onClose: () => void;
  onSave: (data: Partial<Organization>) => void;
}) {
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    industry: organization?.industry || '',
    plan: organization?.plan || 'starter',
    status: organization?.status || 'active',
    messageQuota: organization?.messageQuota || 10000,
    userCount: organization?.userCount || 1,
  });

  // Update form data when organization changes (for edit mode)
  useEffect(() => {
    if (organization && isEdit) {
      setFormData({
        name: organization.name || '',
        industry: organization.industry || '',
        plan: organization.plan || 'starter',
        status: organization.status || 'active',
        messageQuota: organization.messageQuota || 10000,
        userCount: organization.userCount || 1,
      });
    }
  }, [organization, isEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.industry) {
      toast.error('Name and industry are required');
      return;
    }
    onSave(formData);
  };

  const handleSaveClick = () => {
    if (!formData.name || !formData.industry) {
      toast.error('Name and industry are required');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl text-gray-900 dark:text-white">
              {isEdit ? 'Edit Organization' : 'Create Organization'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEdit ? 'Update organization details' : 'Add a new organization to your account'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Modal Body */}
        <form id="organization-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Organization Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Industry <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="Technology"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Plan</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Message Quota
              </label>
              <input
                type="number"
                value={formData.messageQuota}
                onChange={(e) =>
                  setFormData({ ...formData, messageQuota: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                User Count
              </label>
              <input
                type="number"
                value={formData.userCount}
                onChange={(e) =>
                  setFormData({ ...formData, userCount: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {isEdit ? 'Update Organization' : 'Create Organization'}
          </button>
        </div>
      </div>
    </div>
  );
}
