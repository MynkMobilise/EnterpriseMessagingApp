import { useState } from 'react';
import { Search, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export function WebhookEventsMonitor() {
  const events = [
    {
      id: 'evt_1234567890',
      tenant: 'Acme Corporation',
      eventType: 'message.delivered',
      webhookUrl: 'https://acme.com/webhooks/whatsapp',
      status: 'success',
      statusCode: 200,
      timestamp: '2024-03-20 14:35:22',
      responseTime: '145ms',
      attempts: 1,
      payload: {
        message_id: 'msg_1234567890',
        status: 'delivered',
      },
    },
    {
      id: 'evt_0987654321',
      tenant: 'TechStart Inc',
      eventType: 'message.sent',
      webhookUrl: 'https://techstart.io/api/webhooks',
      status: 'success',
      statusCode: 200,
      timestamp: '2024-03-20 14:34:18',
      responseTime: '89ms',
      attempts: 1,
      payload: {
        message_id: 'msg_0987654321',
        status: 'sent',
      },
    },
    {
      id: 'evt_5555555555',
      tenant: 'FinServe Solutions',
      eventType: 'message.failed',
      webhookUrl: 'https://finserve.com/webhooks',
      status: 'failed',
      statusCode: 500,
      timestamp: '2024-03-20 14:33:45',
      responseTime: '5021ms',
      attempts: 3,
      error: 'Internal Server Error',
      payload: {
        message_id: 'msg_5555555555',
        error_code: 'E_INVALID_RECIPIENT',
      },
    },
    {
      id: 'evt_1111111111',
      tenant: 'Global Retail Co',
      eventType: 'message.read',
      webhookUrl: 'https://globalretail.com/api/v1/webhooks',
      status: 'timeout',
      statusCode: null,
      timestamp: '2024-03-20 14:32:10',
      responseTime: '30000ms',
      attempts: 2,
      error: 'Request timeout after 30s',
      payload: {
        message_id: 'msg_1111111111',
        status: 'read',
      },
    },
    {
      id: 'evt_2222222222',
      tenant: 'Acme Corporation',
      eventType: 'template.approved',
      webhookUrl: 'https://acme.com/webhooks/whatsapp',
      status: 'success',
      statusCode: 200,
      timestamp: '2024-03-20 14:30:55',
      responseTime: '201ms',
      attempts: 1,
      payload: {
        template_id: 'tpl_welcome_v2',
        status: 'approved',
      },
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-slate-900 dark:text-white">Webhook Events Monitor</h1>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Monitor webhook delivery status and troubleshoot integration issues
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total Events</p>
          <p className="text-3xl text-slate-900 dark:text-white">892K</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Successful</p>
          <p className="text-3xl text-green-600">874K</p>
          <p className="text-xs text-green-600 mt-1">98.0% success rate</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Failed</p>
          <p className="text-3xl text-red-600">15K</p>
          <p className="text-xs text-red-600 mt-1">1.7% failure rate</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Avg Response Time</p>
          <p className="text-3xl text-slate-900 dark:text-white">156ms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event ID, tenant, or webhook URL..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <select className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300">
            <option>All Events</option>
            <option>message.delivered</option>
            <option>message.sent</option>
            <option>message.failed</option>
            <option>message.read</option>
            <option>template.approved</option>
          </select>
          <select className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300">
            <option>All Status</option>
            <option>Success</option>
            <option>Failed</option>
            <option>Timeout</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Event ID
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Webhook URL
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Response
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Attempts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4">
                    <code className="text-xs text-slate-600 dark:text-slate-400">{event.id}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-900 dark:text-white">{event.tenant}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{event.eventType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-slate-600 dark:text-slate-400 block truncate max-w-xs">
                      {event.webhookUrl}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {event.status === 'success' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Success</span>
                        </>
                      ) : event.status === 'timeout' ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-yellow-600">Timeout</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">Failed</span>
                        </>
                      )}
                    </div>
                    {event.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{event.error}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      {event.statusCode && (
                        <div className="text-slate-900 dark:text-white">{event.statusCode}</div>
                      )}
                      <div className="text-slate-500 mt-0.5">{event.responseTime}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{event.timestamp}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        event.attempts > 1
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {event.attempts}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">Showing 1-5 of 892,347 events</p>
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

      {/* Webhook Signature Verification Info */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-sm text-blue-900 dark:text-blue-200 mb-3">Webhook signature validated</h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          All webhook events are signed using HMAC-SHA256. Verify the <code>X-WhatsApp-Signature</code> header
          to ensure requests are authentic and haven't been tampered with.
        </p>
      </div>
    </div>
  );
}
