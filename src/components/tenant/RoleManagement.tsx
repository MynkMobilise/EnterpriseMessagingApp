import { useState, useEffect } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
  Shield,
  Users,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Info,
  Search,
  Filter,
  Grid3x3,
  Table,
  Save,
  Loader2,
  RotateCcw,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface Role {
  // Phase 2: every row in the Role table has a numeric id. System rows
  // additionally have `roleKey` (the legacy enum value); custom rows don't.
  id: number;
  roleKey?: string | null;
  isSystem: boolean;
  // Convenience alias on the API payload for back-compat with earlier UI code.
  name: string; // For system rows: equals roleKey. For custom rows: the display name.
  displayName: string;
  description: string;
  permissions: Record<string, boolean>;
  userCount: number;
  isSystemRole: boolean;
}

interface RoleStats {
  super_admin: number;
  admin: number;
  manager: number;
  operator: number;
  viewer: number;
}

export function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<RoleStats>({
    super_admin: 0,
    admin: 0,
    manager: 0,
    operator: 0,
    viewer: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const { hasPermission, user } = useAuth();
  const canEditRoles = hasPermission('canAssignRoles');
  // Cap comes from the tenant feature-flag set populated on /auth/me. A
  // starter-plan tenant has 0; Pro has 3; Enterprise has 20 by default. The
  // super admin can override per-tenant via the Tenant Features page.
  const maxCustomRoles = Number(user?.featureFlags?.maxCustomRoles ?? 0);
  const usedCustomRoles = roles.filter((r) => !r.isSystem).length;
  const remainingCustomSlots = Math.max(0, maxCustomRoles - usedCustomRoles);
  const canCreateCustomRole = canEditRoles && maxCustomRoles > 0;

  // Fetch roles and stats
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rolesResponse, statsResponse] = await Promise.all([
          apiService.roles.list(),
          apiService.roles.getStats(),
        ]);

        console.log('RoleManagement - Roles response:', rolesResponse);
        console.log('RoleManagement - Stats response:', statsResponse);

        if (rolesResponse.success && rolesResponse.data) {
          setRoles(rolesResponse.data);
        } else {
          console.warn('RoleManagement - Roles response not successful:', rolesResponse);
          setRoles([]);
        }

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data as RoleStats);
        } else {
          console.warn('RoleManagement - Stats response not successful:', statsResponse);
        }
      } catch (error: any) {
        console.error('Failed to fetch roles:', error);
        toast.error('Failed to load roles', {
          description: error.response?.data?.error?.message || error.message,
        });
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch users for selected role
  useEffect(() => {
    if (selectedRole && showDetailsModal) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const response = await apiService.roles.getUsersByRole(selectedRole.name);
          console.log('RoleManagement - Users by role response:', response);
          if (response.success && response.data) {
            setRoleUsers(response.data);
          } else {
            console.warn('RoleManagement - Users response not successful:', response);
            setRoleUsers([]);
          }
        } catch (error: any) {
          console.error('Failed to fetch users for role:', error);
          toast.error('Failed to load users', {
            description: error.response?.data?.error?.message || error.message,
          });
        } finally {
          setLoadingUsers(false);
        }
      };

      fetchUsers();
    }
  }, [selectedRole, showDetailsModal]);

  const filteredRoles = roles.filter((role) =>
    role.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: Role) => {
    // System rows colored by their enum key; custom rows always orange so
    // they're visually distinguishable from the built-ins at a glance.
    if (!role.isSystem) {
      return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300';
    }
    const key = role.roleKey || role.name;
    switch (key) {
      case 'super_admin':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300';
      case 'admin':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      case 'manager':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      case 'operator':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'viewer':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const handleViewDetails = (role: Role) => {
    setSelectedRole(role);
    setShowDetailsModal(true);
  };

  const permissionLabels: Record<string, string> = {
    canSendMessages: 'Send Messages',
    canApproveMessages: 'Approve Messages',
    canManageUsers: 'Manage Users',
    canManageTemplates: 'Manage Templates',
    canManageContacts: 'Manage Contacts',
    canViewReports: 'View Reports',
    canManageSettings: 'Manage Settings',
    canManageAPIKeys: 'Manage API Keys',
    canAssignRoles: 'Assign Roles',
    canManageOrganization: 'Manage Organization',
    canViewLiveChat: 'View Live Chat',
    canViewLeadership: 'View Leadership Dashboard',
  };

  const refetchRoles = async () => {
    try {
      const r = await apiService.roles.list();
      if (r.success && r.data) setRoles(r.data);
    } catch {
      // ignore — modal will toast its own error
    }
  };

  const handleDeleteCustomRole = async (role: Role) => {
    if (role.isSystem) return;
    if (!window.confirm(`Delete the "${role.displayName}" role? This cannot be undone.`)) return;
    setDeletingIds((s) => new Set([...s, role.id]));
    try {
      const r = await apiService.roles.delete(role.id);
      if (r?.success) {
        toast.success(`Deleted ${role.displayName}`);
        await refetchRoles();
      } else {
        toast.error('Delete failed', { description: r?.error?.message });
      }
    } catch (e: any) {
      toast.error('Delete failed', { description: e?.response?.data?.error?.message || e?.message });
    } finally {
      setDeletingIds((s) => {
        const next = new Set(s);
        next.delete(role.id);
        return next;
      });
    }
  };

  return (
    <div className="colorful p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Role Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            System roles ship with the platform. Custom roles let you carve out
            permissions tailored to your team.
          </p>
        </div>
        {canEditRoles && (
          <div className="flex items-center gap-3">
            {maxCustomRoles > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400 hidden md:block">
                <strong>{usedCustomRoles}</strong> of {maxCustomRoles} custom roles used
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (!canCreateCustomRole) {
                  toast.error('Custom roles are not enabled for your plan. Contact your administrator.');
                  return;
                }
                if (remainingCustomSlots <= 0) {
                  toast.error(
                    `You've used all ${maxCustomRoles} custom-role slots. Contact your administrator to increase the limit.`
                  );
                  return;
                }
                setShowCreateModal(true);
              }}
              disabled={!canCreateCustomRole || remainingCustomSlots <= 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !canCreateCustomRole
                  ? 'Custom roles are not enabled for your plan'
                  : remainingCustomSlots <= 0
                    ? `All ${maxCustomRoles} custom-role slots are in use`
                    : 'Create a new custom role'
              }
            >
              <Plus className="w-4 h-4" />
              Create Custom Role
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(stats).map(([role, count]) => (
          <div
            key={role}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {role.replace('_', ' ')}
                </p>
                <p className="text-2xl text-gray-900 dark:text-white mt-1">{count}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        ))}
      </div>

      {/* Search and View Toggle */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Grid View"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Roles View */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-gray-400">Loading roles...</div>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {searchQuery ? 'No roles found matching your search' : 'No roles available'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg text-gray-900 dark:text-white font-semibold">
                      {role.displayName}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(role)}`}
                    >
                      {role.isSystem ? (role.roleKey || role.name) : 'custom'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {role.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{role.userCount} users</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleViewDetails(role)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </button>
                  {canEditRoles && role.name !== 'super_admin' && (
                    <button
                      onClick={() => setEditingRole(role)}
                      className="text-sm text-gray-700 dark:text-gray-300 hover:underline flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {canEditRoles && !role.isSystem && (
                    <button
                      onClick={() => handleDeleteCustomRole(role)}
                      disabled={deletingIds.has(role.id) || role.userCount > 0}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={role.userCount > 0 ? `Reassign ${role.userCount} user(s) first` : 'Delete this custom role'}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Permissions Preview */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Key Permissions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(role.permissions)
                    .filter(([_, value]) => value === true)
                    .slice(0, 3)
                    .map(([key]) => (
                      <span
                        key={key}
                        className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded"
                      >
                        {permissionLabels[key] || key}
                      </span>
                    ))}
                  {Object.values(role.permissions).filter((v) => v === true).length > 3 && (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                      +{Object.values(role.permissions).filter((v) => v === true).length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRoles.map((role) => (
                  <tr
                    key={role.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {role.displayName}
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${getRoleBadgeColor(role)}`}
                          >
                            {role.isSystem ? (role.roleKey || role.name) : 'custom'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                        {role.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{role.userCount}</span>
                        <span className="text-gray-500 dark:text-gray-400">users</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {Object.entries(role.permissions)
                          .filter(([_, value]) => value === true)
                          .slice(0, 4)
                          .map(([key]) => (
                            <span
                              key={key}
                              className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded"
                            >
                              {permissionLabels[key] || key}
                            </span>
                          ))}
                        {Object.values(role.permissions).filter((v) => v === true).length > 4 && (
                          <span className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400">
                            +{Object.values(role.permissions).filter((v) => v === true).length - 4}
                          </span>
                        )}
                        {Object.values(role.permissions).filter((v) => v === true).length === 0 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">No permissions</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleViewDetails(role)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </button>
                        {canEditRoles && role.name !== 'super_admin' && (
                          <button
                            onClick={() => setEditingRole(role)}
                            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                        {canEditRoles && !role.isSystem && (
                          <button
                            onClick={() => handleDeleteCustomRole(role)}
                            disabled={deletingIds.has(role.id) || role.userCount > 0}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={role.userCount > 0 ? `Reassign ${role.userCount} user(s) first` : 'Delete this custom role'}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingRole && (
        <RolePermissionsEditor
          role={editingRole}
          permissionLabels={permissionLabels}
          onClose={() => setEditingRole(null)}
          onSaved={() => {
            setEditingRole(null);
            refetchRoles();
          }}
        />
      )}

      {/* Create Custom Role Modal */}
      {showCreateModal && (
        <CreateCustomRoleModal
          permissionLabels={permissionLabels}
          remainingSlots={remainingCustomSlots}
          maxSlots={maxCustomRoles}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refetchRoles();
          }}
        />
      )}

      {/* Role Details Modal */}
      {showDetailsModal && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl text-gray-900 dark:text-white">
                  {selectedRole.displayName} Role Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedRole.description}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRole(null);
                  setRoleUsers([]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Permissions */}
              <div>
                <h3 className="text-lg text-gray-900 dark:text-white mb-4">Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(selectedRole.permissions).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">
                        {permissionLabels[key] || key}
                      </span>
                      {value ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Users with this role */}
              <div>
                <h3 className="text-lg text-gray-900 dark:text-white mb-4">
                  Users ({roleUsers.length})
                </h3>
                {loadingUsers ? (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    Loading users...
                  </div>
                ) : roleUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    No users assigned to this role
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roleUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            user.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {user.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------ Edit-Permissions Modal ------------------------- */

function RolePermissionsEditor({
  role,
  permissionLabels,
  onClose,
  onSaved,
}: {
  role: Role;
  permissionLabels: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Local copy of the permission map, edited in-place.
  const [perms, setPerms] = useState<Record<string, boolean>>({ ...role.permissions });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Permission keys to show — pulled from the labels map so we always render
  // a stable set even if the role response is missing newer keys.
  const keys = Object.keys(permissionLabels);

  const toggle = (key: string) => {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Submit the full permission map — backend whitelists & sanitizes.
      const payload: Record<string, boolean> = {};
      for (const k of keys) payload[k] = !!perms[k];
      const r = await apiService.roles.updatePermissions(role.name, payload);
      if (r?.success) {
        toast.success(`Permissions saved for ${role.displayName}`);
        onSaved();
      } else {
        toast.error('Save failed', { description: r?.error?.message });
      }
    } catch (e: any) {
      toast.error('Save failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset ${role.displayName} permissions to system defaults?`)) return;
    setResetting(true);
    try {
      const r = await apiService.roles.resetPermissions(role.name);
      if (r?.success) {
        toast.success('Reset to defaults');
        onSaved();
      }
    } catch (e: any) {
      toast.error('Reset failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg text-gray-900 dark:text-white">
              Edit {role.displayName} Permissions
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Changes apply to every {role.displayName.toLowerCase()} in your organization.
              You can reset to system defaults at any time.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            aria-label="Close"
          >
            <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {keys.map((key) => {
              const enabled = !!perms[key];
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => toggle(key)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                    enabled
                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <span className="text-sm text-gray-900 dark:text-white">
                    {permissionLabels[key] || key}
                  </span>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                      enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        enabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
            <Lock className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Per-user overrides (set in User Management → Edit) still take precedence over
              role-level permissions. Use them for one-off exceptions.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Reset to defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || resetting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Create Custom Role Modal ----------------------- */

function CreateCustomRoleModal({
  permissionLabels,
  remainingSlots,
  maxSlots,
  onClose,
  onCreated,
}: {
  permissionLabels: Record<string, string>;
  remainingSlots: number;
  maxSlots: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  // Sensible operator-level defaults — tenant Admin fine-tunes from here.
  const initialPerms: Record<string, boolean> = {
    canSendMessages: true,
    canApproveMessages: false,
    canManageUsers: false,
    canManageTemplates: false,
    canManageContacts: true,
    canViewReports: false,
    canManageSettings: false,
    canManageAPIKeys: false,
    canAssignRoles: false,
    canManageOrganization: false,
    canViewLiveChat: true,
    canViewLeadership: false,
  };
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [perms, setPerms] = useState<Record<string, boolean>>(initialPerms);
  const [saving, setSaving] = useState(false);
  const keys = Object.keys(permissionLabels);

  const toggle = (k: string) => setPerms((p) => ({ ...p, [k]: !p[k] }));

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Role name is required');
      return;
    }
    setSaving(true);
    try {
      const r = await apiService.roles.create({
        name: trimmed,
        description: description.trim() || null,
        permissions: perms,
      });
      if (r?.success) {
        toast.success(`Created "${r.data.displayName}"`);
        onCreated();
      } else {
        toast.error('Create failed', { description: r?.error?.message });
      }
    } catch (e: any) {
      toast.error('Create failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg text-gray-900 dark:text-white">Create Custom Role</h3>
            <p className="text-xs text-gray-500 mt-1">
              {remainingSlots} of {maxSlots} custom-role slot{maxSlots === 1 ? '' : 's'} remaining
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            aria-label="Close"
          >
            <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Role name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 64))}
              placeholder="e.g. Marketing Lead, Approver, Support Tier 1"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              placeholder="What does this role do?"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Permissions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {keys.map((key) => {
                const enabled = !!perms[key];
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggle(key)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                      enabled
                        ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-800'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <span className="text-sm text-gray-900 dark:text-white">
                      {permissionLabels[key] || key}
                    </span>
                    <div
                      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                        enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          enabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create role
          </button>
        </div>
      </div>
    </div>
  );
}
