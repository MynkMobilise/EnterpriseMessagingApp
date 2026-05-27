import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Briefcase,
  Building,
  Eye,
  X,
  Check,
  Ban,
  UserCheck,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { User, UserRole, UserStatus, CreateUserPayload, UpdateUserPayload, DEFAULT_PERMISSIONS, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../types/user';
import { useOrganization } from '../../contexts/OrganizationContext';
import { apiService } from '../../utils/api';

// Shape of a row returned by /api/v1/roles. Mirrors the backend's enrichment:
// for system rows, `name` is the legacy enum value (super_admin/...) and
// `displayName` is the human label. Custom rows have name === displayName.
export interface RoleOption {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  isSystemRole?: boolean;
  roleKey?: string | null;
  userCount?: number;
  permissions?: Record<string, boolean>;
}

// Resolve the display label for a user's role. Prefers the actual Role row
// (so a user assigned to a custom role like "Marketing Lead" shows that
// label) and falls back to ROLE_LABELS when the role list hasn't loaded.
function resolveUserRoleLabel(user: User, roles: RoleOption[]): string {
  const userRoleId = (user as any).roleId as number | undefined;
  if (userRoleId) {
    const row = roles.find((r) => r.id === userRoleId);
    if (row) return row.displayName || row.name;
  }
  return ROLE_LABELS[user.role] || user.role;
}

export function UserManagement() {
  const { organizations, currentOrganization } = useOrganization();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // All roles available to assign — system rows + any custom rows the tenant
  // has created. Refetched when the modal opens to pick up brand-new custom
  // roles without a full page reload.
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);

  // Fetch the role list (system + custom) for the current org. Cheap — runs
  // once on mount and whenever the user opens a create / edit modal so a
  // freshly-created custom role shows up without a refresh.
  const refreshRoles = async () => {
    try {
      const r = await apiService.roles.list();
      if (r?.success && Array.isArray(r.data)) {
        setAvailableRoles(r.data as RoleOption[]);
      }
    } catch (_) { /* non-fatal — modal still works with the cached list */ }
  };
  useEffect(() => {
    if (currentOrganization) refreshRoles();
  }, [currentOrganization?.id]);

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentOrganization) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await apiService.users.list();
        console.log('UserManagement - API response:', response);
        if (response.success && response.data) {
          // Transform API response to match User type
          const transformedUsers = response.data.map((user: any) => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            // Phase 2: roleId is the source-of-truth for "which Role row this
            // user belongs to". Carried through so the edit modal can resolve
            // the right option (including custom roles) and the list view
            // can display the role's display name.
            roleId: user.roleId,
            status: user.status,
            phoneNumber: user.phoneNumber,
            department: user.department,
            jobTitle: user.jobTitle,
            organizationId: user.organizationId,
            organizationName: user.organization?.name || 'Unknown',
            lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : null,
            permissions: user.permissions || {},
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }));
          console.log('UserManagement - Transformed users:', transformedUsers);
          setUsers(transformedUsers);
        } else {
          console.warn('UserManagement - API response not successful:', response);
          setUsers([]);
        }
      } catch (error: any) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to load users', {
          description: error.response?.data?.error?.message || error.message,
        });
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentOrganization]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
  });

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentOrganization) return;

      try {
        const response = await apiService.users.getStats();
        if (response.success && response.data) {
          setStats({
            total: response.data.total || 0,
            active: response.data.active || 0,
            inactive: response.data.inactive || 0,
            admins: response.data.admins || 0,
          });
        }
      } catch (error: any) {
        console.error('Failed to fetch user stats:', error);
        // Fallback to local stats
        setStats({
          total: users.length,
          active: users.filter(u => u.status === 'active').length,
          inactive: users.filter(u => u.status === 'inactive').length,
          admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
        });
      }
    };

    fetchStats();
  }, [currentOrganization, users.length]);

  const handleCreateUser = async (userData: CreateUserPayload) => {
    try {
      const response = await apiService.users.create(userData);
      if (response.success) {
        toast.success('User created successfully');
        setShowCreateModal(false);
        // Refresh users list
        const usersResponse = await apiService.users.list();
        if (usersResponse.success && usersResponse.data) {
          const transformedUsers = usersResponse.data.map((user: any) => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            phoneNumber: user.phoneNumber,
            department: user.department,
            jobTitle: user.jobTitle,
            organizationId: user.organizationId,
            organizationName: user.organization?.name || 'Unknown',
            lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : null,
            permissions: user.permissions || {},
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }));
          setUsers(transformedUsers);
        }
        // Refresh stats
        const statsResponse = await apiService.users.getStats();
        if (statsResponse.success && statsResponse.data) {
          setStats({
            total: statsResponse.data.total || 0,
            active: statsResponse.data.active || 0,
            inactive: statsResponse.data.inactive || 0,
            admins: statsResponse.data.admins || 0,
          });
        }
      }
    } catch (error: any) {
      toast.error('Failed to create user', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (userId: string, userData: UpdateUserPayload) => {
    try {
      const response = await apiService.users.update(userId, userData);
      if (response.success) {
        toast.success('User updated successfully');
        setShowEditModal(false);
        // Refresh users list
        const usersResponse = await apiService.users.list();
        if (usersResponse.success && usersResponse.data) {
          const transformedUsers = usersResponse.data.map((user: any) => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            phoneNumber: user.phoneNumber,
            department: user.department,
            jobTitle: user.jobTitle,
            organizationId: user.organizationId,
            organizationName: user.organization?.name || 'Unknown',
            lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : null,
            permissions: user.permissions || {},
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }));
          setUsers(transformedUsers);
        }
        // Refresh stats
        const statsResponse = await apiService.users.getStats();
        if (statsResponse.success && statsResponse.data) {
          setStats({
            total: statsResponse.data.total || 0,
            active: statsResponse.data.active || 0,
            inactive: statsResponse.data.inactive || 0,
            admins: statsResponse.data.admins || 0,
          });
        }
      }
    } catch (error: any) {
      toast.error('Failed to update user', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await apiService.users.delete(userId);
        if (response.success) {
          toast.success('User deleted successfully');
          // Refresh users list
          const usersResponse = await apiService.users.list();
          if (usersResponse.success && usersResponse.data) {
            const transformedUsers = usersResponse.data.map((user: any) => ({
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              status: user.status,
              phoneNumber: user.phoneNumber,
              department: user.department,
              jobTitle: user.jobTitle,
              organizationId: user.organizationId,
              organizationName: user.organization?.name || 'Unknown',
              lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : null,
              permissions: user.permissions || {},
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            }));
            setUsers(transformedUsers);
          }
          // Refresh stats
          const statsResponse = await apiService.users.getStats();
          if (statsResponse.success && statsResponse.data) {
            setStats({
              total: statsResponse.data.total || 0,
              active: statsResponse.data.active || 0,
              inactive: statsResponse.data.inactive || 0,
              admins: statsResponse.data.admins || 0,
            });
          }
        }
      } catch (error: any) {
        toast.error('Failed to delete user', {
          description: error.response?.data?.error?.message || error.message,
        });
      }
    }
  };

  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    toast.success(`User status changed to ${newStatus}`);
    // API call will happen here
  };

  const handleViewPermissions = (user: User) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const handleResendCredentials = async (userId: string) => {
    try {
      const response = await apiService.users.resendCredentials(userId);
      if (response.success) {
        toast.success('Login credentials sent successfully', {
          description: 'The user will receive an email with their new login credentials.',
        });
      }
    } catch (error: any) {
      toast.error('Failed to resend credentials', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300';
      case 'admin':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      case 'manager':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'operator':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300';
      case 'viewer':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusBadgeColor = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
      case 'suspended':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="colorful p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage users, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.active}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.inactive}</p>
            </div>
            <Ban className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
              <p className="text-2xl text-gray-900 dark:text-white mt-1">{stats.admins}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
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
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Administrator</option>
            <option value="manager">Manager</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {searchQuery || filterRole !== 'all' || filterStatus !== 'all'
                        ? 'No users found matching your filters'
                        : 'No users yet. Create your first user to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        <Shield className="w-3 h-3" />
                        {resolveUserRoleLabel(user, availableRoles)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900 dark:text-white">{user.department || '-'}</p>
                        {user.jobTitle && (
                          <p className="text-xs text-gray-500">{user.jobTitle}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.organizationName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs capitalize ${getStatusBadgeColor(
                          user.status
                        )}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {user.lastLoginAt || 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewPermissions(user)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="View Permissions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete User"
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

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          organizations={organizations}
          currentOrganizationId={currentOrganization?.id}
          availableRoles={availableRoles}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          organizations={organizations}
          availableRoles={availableRoles}
          onClose={() => setShowEditModal(false)}
          onSubmit={(data) => handleUpdateUser(selectedUser.id, data)}
        />
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <PermissionsModal
          user={selectedUser}
          onClose={() => setShowPermissionsModal(false)}
          onResendCredentials={handleResendCredentials}
        />
      )}
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({
  organizations,
  currentOrganizationId,
  availableRoles,
  onClose,
  onSubmit,
}: {
  organizations: any[];
  currentOrganizationId?: string | number;
  availableRoles: RoleOption[];
  onClose: () => void;
  onSubmit: (data: CreateUserPayload) => void;
}) {
  // Pin to the active org (tenant admins only have one; super-admins switching
  // into a tenant via the org-switcher act in that tenant). Falls back to
  // organizations[0] if no current is provided so the form never breaks.
  const initialOrgId = currentOrganizationId ?? organizations[0]?.id ?? '';
  // Default to the "operator" system row when available (and only if the
  // role list has loaded — falls back to the legacy enum otherwise).
  const defaultRole = availableRoles.find((r) => r.isSystem && r.roleKey === 'operator') || availableRoles[0];
  const [formData, setFormData] = useState<CreateUserPayload>({
    email: '',
    firstName: '',
    lastName: '',
    // Legacy enum slot — we keep it populated for backend back-compat. The
    // primary signal is `roleId` below.
    role: (defaultRole?.roleKey as UserRole) || 'operator',
    roleId: defaultRole?.id || null,
    organizationId: initialOrgId as any,
    phoneNumber: '',
    department: '',
    jobTitle: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-xl text-gray-900 dark:text-white">Create New User</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="John"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Email + Phone share a row now that the Organization field is
              implicit. Keeps the form symmetrical (every row has 2 columns
              on md+) instead of leaving Phone alone in a half-empty row. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="john.doe@company.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="Marketing"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="Marketing Manager"
              />
            </div>
          </div>

          {/* Role Selection — dynamic list of system + custom roles. */}
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Role *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableRoles.length === 0 ? (
                <p className="text-sm text-gray-500 col-span-2">Loading roles…</p>
              ) : (
                availableRoles.map((r) => {
                  const isActive = formData.roleId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        roleId: r.id,
                        // Keep legacy enum in sync for system rows so the backend
                        // back-compat path still resolves the same row. For
                        // custom rows the enum stays as 'operator' (a safe
                        // baseline) and the backend uses roleId instead.
                        role: (r.roleKey as UserRole) || 'operator',
                      })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {r.displayName || r.name}
                        </span>
                        {!r.isSystem && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
                            custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {r.description || ROLE_DESCRIPTIONS[(r.roleKey as UserRole) || 'operator'] || ''}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Validate required fields
              if (!formData.email || !formData.firstName || !formData.lastName) {
                toast.error('Please fill in all required fields');
                return;
              }
              onSubmit(formData);
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({
  user,
  organizations,
  availableRoles,
  onClose,
  onSubmit,
}: {
  user: User;
  organizations: any[];
  availableRoles: RoleOption[];
  onClose: () => void;
  onSubmit: (data: UpdateUserPayload) => void;
}) {
  // Resolve the user's currently-assigned Role row. Prefer roleId when the
  // backend has populated it; otherwise fall back to matching by the legacy
  // enum (system rows expose it as `name`).
  const userRoleId = (user as any).roleId as number | undefined;
  const currentRole =
    (userRoleId && availableRoles.find((r) => r.id === userRoleId))
    || availableRoles.find((r) => r.isSystem && (r.roleKey || r.name) === user.role);

  const [formData, setFormData] = useState<UpdateUserPayload>({
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    roleId: currentRole?.id || null,
    status: user.status,
    phoneNumber: user.phoneNumber || '',
    department: user.department || '',
    jobTitle: user.jobTitle || '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-xl text-gray-900 dark:text-white">Edit User</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select
                value={formData.roleId ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const picked = availableRoles.find((r) => r.id === id);
                  setFormData({
                    ...formData,
                    roleId: id,
                    role: (picked?.roleKey as UserRole) || 'operator',
                  });
                }}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                {availableRoles.length === 0 ? (
                  <option value="">Loading…</option>
                ) : (
                  availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.displayName || r.name}{r.isSystem ? '' : ' (custom)'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            Update User
          </button>
        </div>
      </div>
    </div>
  );
}

// Permissions Modal Component
function PermissionsModal({ user, onClose, onResendCredentials }: { user: User; onClose: () => void; onResendCredentials: (userId: string) => void }) {
  const permissions = user.permissions;

  const permissionGroups = [
    {
      title: 'Message Permissions',
      permissions: [
        { key: 'canSendMessages', label: 'Send Messages' },
        { key: 'canApproveMessages', label: 'Approve Messages' },
        { key: 'canViewMessageLogs', label: 'View Message Logs' },
        { key: 'canExportMessageLogs', label: 'Export Message Logs' },
      ],
    },
    {
      title: 'Template Permissions',
      permissions: [
        { key: 'canCreateTemplates', label: 'Create Templates' },
        { key: 'canEditTemplates', label: 'Edit Templates' },
        { key: 'canDeleteTemplates', label: 'Delete Templates' },
        { key: 'canApproveTemplates', label: 'Approve Templates' },
      ],
    },
    {
      title: 'Contact Permissions',
      permissions: [
        { key: 'canManageContacts', label: 'Manage Contacts' },
        { key: 'canImportContacts', label: 'Import Contacts' },
        { key: 'canExportContacts', label: 'Export Contacts' },
      ],
    },
    {
      title: 'User Management',
      permissions: [
        { key: 'canManageUsers', label: 'Manage Users' },
        { key: 'canViewUsers', label: 'View Users' },
        { key: 'canAssignRoles', label: 'Assign Roles' },
      ],
    },
    {
      title: 'Organization & Settings',
      permissions: [
        { key: 'canManageOrganization', label: 'Manage Organization' },
        { key: 'canViewBilling', label: 'View Billing' },
        { key: 'canManageAPIKeys', label: 'Manage API Keys' },
        { key: 'canManageSettings', label: 'Manage Settings' },
        { key: 'canManageIntegrations', label: 'Manage Integrations' },
      ],
    },
    {
      title: 'Reports & Analytics',
      permissions: [
        { key: 'canViewReports', label: 'View Reports' },
        { key: 'canExportReports', label: 'Export Reports' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-xl text-gray-900 dark:text-white">User Permissions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {user.firstName} {user.lastName} - {ROLE_LABELS[user.role]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {permissionGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm text-gray-900 dark:text-white mb-3">{group.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.permissions.map((perm) => {
                  const hasPermission = permissions[perm.key as keyof typeof permissions];
                  return (
                    <div
                      key={perm.key}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        hasPermission
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {hasPermission ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                      <span
                        className={`text-sm ${
                          hasPermission
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {perm.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          <button
            onClick={() => onResendCredentials(user.id)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Resend Login Credentials
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
