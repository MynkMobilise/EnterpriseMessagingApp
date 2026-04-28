import { useState } from 'react';
import { Search, Filter, RefreshCw, Download, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function MessageMonitor() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const messages = [
    {
      id: 'msg_1234567890',
      tenant: 'Acme Corporation',
      phoneNumber: '+1 234 567 8900',
      recipient: '+1 987 654 3210',
      type: 'template',
      templateName: 'Welcome Message',
      status: 'delivered',
      timestamp: '2024-03-20 14:35:22',
      deliveryTime: '2.3s',
      wabaId: 'WABA-1234567890',
    },
    {
      id: 'msg_0987654321',
      tenant: 'TechStart Inc',
      phoneNumber: '+44 20 7123 4567',
      recipient: '+44 7700 900123',
      type: 'text',
      templateName: null,
      status: 'sent',
      timestamp: '2024-03-20 14:34:18',
      deliveryTime: '1.8s',
      wabaId: 'WABA-0987654321',
    },
    {
      id: 'msg_5555555555',
      tenant: 'FinServe Solutions',
      phoneNumber: '+1 555 123 4567',
      recipient: '+1 555 987 6543',
      type: 'template',
      templateName: 'Payment Reminder',
      status: 'failed',
      timestamp: '2024-03-20 14:33:45',
      deliveryTime: null,
      wabaId: 'WABA-5555555555',
      errorCode: 'E_INVALID_RECIPIENT',
      errorMessage: 'Invalid recipient phone number format',
    },
    {
      id: 'msg_1111111111',
      tenant: 'Acme Corporation',
      phoneNumber: '+1 234 567 8900',
      recipient: '+1 234 555 0199',
      type: 'media',
      templateName: null,
      status: 'delivered',
      timestamp: '2024-03-20 14:32:10',
      deliveryTime: '3.7s',
      wabaId: 'WABA-1234567890',
    },
    {
      id: 'msg_2222222222',
      tenant: 'Global Retail Co',
      phoneNumber: '+1 234 567 8902',
      recipient: '+1 234 555 0177',
      type: 'template',
      templateName: 'Order Confirmation',
      status: 'read',
      timestamp: '2024-03-20 14:30:55',
      deliveryTime: '2.1s',
      wabaId: 'WABA-1234567890',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'sent':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'read':
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-slate-900 dark:text-white">Message Monitor (Global)</h1>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-refresh
            </label>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button className="px-4 py-2 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Real-time monitoring of all messages across all tenants
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <p className="text-2xl text-slate-900 dark:text-white mb-1">1.2M</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Today</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl text-green-600 mb-1">1.17M</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Delivered</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl text-blue-600 mb-1">18K</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl text-red-600 mb-1">3.2K</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Failed</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-2xl text-slate-900 dark:text-white mb-1">97.3%</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Success Rate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by message ID, phone number, or tenant..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <select className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300">
            <option>All Status</option>
            <option>Delivered</option>
            <option>Sent</option>
            <option>Read</option>
            <option>Failed</option>
          </select>
          <select className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300">
            <option>All Types</option>
            <option>Template</option>
            <option>Text</option>
            <option>Media</option>
          </select>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Message ID
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  From → To
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Delivery Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
              {messages.map((message) => (
                <tr key={message.id} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4">
                    <code className="text-xs text-slate-600 dark:text-slate-400">{message.id}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-900 dark:text-white">{message.tenant}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      <div className="text-slate-600 dark:text-slate-400 font-mono">{message.phoneNumber}</div>
                      <div className="text-slate-500 mt-0.5">→ {message.recipient}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="text-sm text-slate-900 dark:text-white capitalize">{message.type}</span>
                      {message.templateName && (
                        <p className="text-xs text-slate-500 mt-0.5">{message.templateName}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(message.status)}
                      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{message.status}</span>
                    </div>
                    {message.status === 'failed' && message.errorMessage && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{message.errorCode}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{message.timestamp}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {message.deliveryTime || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">Showing 1-5 of 1,234,567 messages</p>
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
    </div>
  );
}
