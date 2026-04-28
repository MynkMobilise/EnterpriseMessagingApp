import { useState } from 'react';
import { Shield, Users, Key, Lock, AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';

export function SecurityAccessControl() {
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const roles = [
    {
      id: 1,
      name: 'Super Admin',
      description: 'Full system access including security and billing',
      permissions: 15,
      users: 2,
      critical: true,
    },
    {
      id: 2,
      name: 'Admin',
      description: 'Manage tenants, templates, and configurations',
      permissions: 12,
      users: 5,
      critical: false,
    },
    {
      id: 3,
      name: 'Support',
      description: 'View logs and assist with tenant issues',
      permissions: 6,
      users: 8,
      critical: false,
    },
    {
      id: 4,
      name: 'Viewer',
      description: 'Read-only access to dashboards and reports',
      permissions: 3,
      users: 12,
      critical: false,
    },
  ];

  const adminUsers = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@enterprise.com',
      role: 'Super Admin',
      status: 'active',
      mfaEnabled: true,
      lastLogin: '2 hours ago',
      createdAt: '2023-01-15',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.j@enterprise.com',
      role: 'Admin',
      status: 'active',
      mfaEnabled: true,
      lastLogin: '30 minutes ago',
      createdAt: '2023-03-20',
    },
    {
      id: 3,
      name: 'Mike Davis',
      email: 'mike.d@enterprise.com',
      role: 'Support',
      status: 'active',
      mfaEnabled: false,
      lastLogin: '1 day ago',
      createdAt: '2023-06-10',
    },
    {
      id: 4,
      name: 'Emily Brown',
      email: 'emily.b@enterprise.com',
      role: 'Admin',
      status: 'suspended',
      mfaEnabled: true,
      lastLogin: '15 days ago',
      createdAt: '2023-02-28',
    },
  ];

  const ipAllowlist = [
    {
      id: 1,
      ipAddress: '192.168.1.0/24',
      description: 'Office Network',
      addedBy: 'admin@enterprise.com',
      addedAt: '2024-01-15',
    },
    {
      id: 2,
      ipAddress: '203.0.113.0/24',
      description: 'Remote VPN',
      addedBy: 'security@enterprise.com',
      addedAt: '2024-02-10',
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-white mb-2">Security & Access Control</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage roles, permissions, MFA enforcement, and security policies
        </p>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Security Status</p>
          <p className="text-xl text-green-600">Secure</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 dark:text-white mb-1">27</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Admin Users</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 dark:text-white mb-1">89%</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">MFA Enabled</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 dark:text-white mb-1">2</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Failed Logins (24h)</p>
        </div>
      </div>

      {/* RBAC Roles */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-900 dark:text-white">RBAC Roles</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm text-slate-900 dark:text-white">{role.name}</h4>
                  {role.critical && (
                    <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full">
                      Critical
                    </span>
                  )}
                </div>
                <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{role.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  {role.permissions} permissions
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {role.users} users
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-slate-900 dark:text-white">Admin Users</h3>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                MFA
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
            {adminUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.mfaEnabled ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">Enabled</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">Disabled</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{user.lastLogin}</span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* IP Allowlist */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-900 dark:text-white">IP Allowlist</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Add IP Range
          </button>
        </div>
        <div className="space-y-3">
          {ipAllowlist.map((ip) => (
            <div
              key={ip.id}
              className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div>
                <code className="text-sm text-slate-900 dark:text-white">{ip.ipAddress}</code>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {ip.description} • Added by {ip.addedBy} on {ip.addedAt}
                </p>
              </div>
              <button className="text-sm text-red-600 dark:text-red-400 hover:underline">Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* Security Policies */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
        <h3 className="text-slate-900 dark:text-white mb-6">Security Policies</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-gray-800">
            <div>
              <p className="text-sm text-slate-900 dark:text-white">Enforce MFA for all users</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Require multi-factor authentication for admin access
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-gray-800">
            <div>
              <p className="text-sm text-slate-900 dark:text-white">Session timeout</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Auto-logout after 30 minutes of inactivity
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-gray-800">
            <div>
              <p className="text-sm text-slate-900 dark:text-white">IP allowlist enforcement</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Restrict access to approved IP ranges only
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-slate-900 dark:text-white">Audit log retention</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Keep audit logs for 90 days</p>
            </div>
            <select className="px-3 py-2 text-sm bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-700 dark:text-slate-300">
              <option>30 days</option>
              <option>60 days</option>
              <option selected>90 days</option>
              <option>1 year</option>
              <option>Forever</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-gray-800">
              <h2 className="text-xl text-slate-900 dark:text-white mb-1">Add Admin User</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Create a new administrator account</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John Smith"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="john@enterprise.com"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                  <option>Select role...</option>
                  <option>Admin</option>
                  <option>Support</option>
                  <option>Viewer</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-slate-700 dark:text-slate-300">Require MFA setup on first login</label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
