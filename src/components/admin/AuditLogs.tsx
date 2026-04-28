import { useState } from 'react';
import { Search, Filter, Download, CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react';

export function AuditLogs() {
  const logs = [
    {
      id: 'log_1234567890',
      timestamp: '2024-03-20 14:35:22.145',
      adminUser: 'admin@enterprise.com',
      action: 'tenant.created',
      resource: 'Tenant: NewCorp Inc',
      resourceId: 'tenant_abc123',
      status: 'success',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      correlationId: 'corr_xyz789',
      details: 'Created new tenant with Enterprise plan',
    },
    {
      id: 'log_0987654321',
      timestamp: '2024-03-20 14:34:18.892',
      adminUser: 'security@enterprise.com',
      action: 'api_key.revoked',
      resource: 'API Key: sk_live_old123',
      resourceId: 'key_def456',
      status: 'success',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0...',
      correlationId: 'corr_abc456',
      details: 'Revoked compromised API key for Global Retail Co',
    },
    {
      id: 'log_5555555555',
      timestamp: '2024-03-20 14:33:45.234',
      adminUser: 'admin@enterprise.com',
      action: 'template.approved',
      resource: 'Template: Welcome Message v2',
      resourceId: 'tpl_ghi789',
      status: 'success',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      correlationId: 'corr_def123',
      details: 'Approved template for Acme Corporation',
    },
    {
      id: 'log_1111111111',
      timestamp: '2024-03-20 14:32:10.567',
      adminUser: 'ops@enterprise.com',
      action: 'quota.updated',
      resource: 'Tenant: FinServe Solutions',
      resourceId: 'tenant_jkl012',
      status: 'success',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0...',
      correlationId: 'corr_ghi456',
      details: 'Increased daily quota from 100k to 150k messages',
    },
    {
      id: 'log_2222222222',
      timestamp: '2024-03-20 14:30:55.789',
      adminUser: 'security@enterprise.com',
      action: 'user.login_failed',
      resource: 'Admin User: unauthorized@example.com',
      resourceId: null,
      status: 'failure',
      ipAddress: '203.0.113.42',
      userAgent: 'curl/7.68.0',
      correlationId: 'corr_jkl789',
      details: 'Failed login attempt - invalid credentials',
    },
    {
      id: 'log_3333333333',
      timestamp: '2024-03-20 14:29:12.345',
      adminUser: 'admin@enterprise.com',
      action: 'waba.connected',
      resource: 'WABA: WABA-1234567890',
      resourceId: 'waba_mno345',
      status: 'success',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      correlationId: 'corr_mno012',
      details: 'Connected new WhatsApp Business Account for TechStart Inc',
    },
  ];

  const actionTypes = [
    'tenant.created',
    'tenant.updated',
    'tenant.deleted',
    'api_key.created',
    'api_key.revoked',
    'template.approved',
    'template.rejected',
    'quota.updated',
    'waba.connected',
    'waba.disconnected',
    'user.login',
    'user.login_failed',
    'user.logout',
    'settings.updated',
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-slate-900 dark:text-white">Audit Logs</h1>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Complete audit trail of all administrative actions and system events
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total Events Today</p>
          <p className="text-3xl text-slate-900 dark:text-white">12,847</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Successful Actions</p>
          <p className="text-3xl text-green-600">12,789</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Failed Actions</p>
          <p className="text-3xl text-red-600">58</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Unique Users</p>
          <p className="text-3xl text-slate-900 dark:text-white">8</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-4 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by admin user, action, resource, or correlation ID..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <select className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300">
              <option>All Actions</option>
              {actionTypes.map((action) => (
                <option key={action}>{action}</option>
              ))}
            </select>
            <select className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300">
              <option>All Status</option>
              <option>Success</option>
              <option>Failure</option>
            </select>
            <input
              type="date"
              className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            />
            <input
              type="date"
              className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Admin User
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Correlation ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {log.timestamp}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-900 dark:text-white">{log.adminUser}</span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      {log.action}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-slate-900 dark:text-white">{log.resource}</p>
                      {log.resourceId && (
                        <code className="text-xs text-slate-500 mt-0.5 block">{log.resourceId}</code>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {log.status === 'success' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Success</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">Failure</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-slate-600 dark:text-slate-400">{log.ipAddress}</code>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-slate-600 dark:text-slate-400">{log.correlationId}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">Showing 1-6 of 12,847 logs</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm border border-slate-300 dark:border-gray-700 rounded hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 transition-colors">
              Previous
            </button>
            <button className="px-3 py-1 text-sm border border-slate-300 dark:border-gray-700 rounded hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <h3 className="text-blue-900 dark:text-blue-200 mb-2">Compliance & Data Retention</h3>
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
              Audit logs are retained for 90 days and comply with SOC 2, ISO 27001, and GDPR requirements.
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              All logs are encrypted at rest and in transit. Access is restricted to authorized administrators only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
