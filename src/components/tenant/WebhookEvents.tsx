import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface WebhookEvent {
  id: number;
  type: string;
  messageId: string;
  to: string;
  timestamp: string;
  erpStatus: 'forwarded' | 'failed' | 'pending';
  erpResponse: number | null;
  correlationId: string;
  error?: string;
}

export function WebhookEvents() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch webhook events - replace with actual API call
  useEffect(() => {
    // fetchWebhookEvents().then(setEvents).catch(handleError);
    setLoading(false);
  }, []);

  const stats = {
    total: events.length,
    forwarded: events.filter(e => e.erpStatus === 'forwarded').length,
    failed: events.filter(e => e.erpStatus === 'failed').length,
    pending: events.filter(e => e.erpStatus === 'pending').length,
  };

  return (
    <div className="p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl text-gray-900 dark:text-white mb-2">Webhook Events</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor webhook delivery and ERP forwarding status
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Events Today</p>
          <p className="text-2xl md:text-3xl text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Forwarded to ERP</p>
          <p className="text-2xl md:text-3xl text-green-600">{stats.forwarded}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Failed</p>
          <p className="text-2xl md:text-3xl text-red-600">{stats.failed}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pending</p>
          <p className="text-2xl md:text-3xl text-blue-600">{stats.pending}</p>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Message ID
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  ERP Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Correlation ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4">
                    <code className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      {event.type}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-gray-600 dark:text-gray-400">{event.messageId}</code>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm text-gray-900 dark:text-white">{event.to}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{event.timestamp}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {event.erpStatus === 'forwarded' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Forwarded</span>
                          <span className="text-xs text-gray-500">({event.erpResponse})</span>
                        </>
                      ) : event.erpStatus === 'failed' ? (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">Failed</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-600">Pending</span>
                        </>
                      )}
                    </div>
                    {event.error && (
                      <p className="text-xs text-red-600 mt-1">{event.error}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-gray-600 dark:text-gray-400">{event.correlationId}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Showing 1-4 of 847 events</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors">
              Previous
            </button>
            <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="text-blue-900 dark:text-blue-100 mb-3">📡 Webhook Events</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
          All WhatsApp status update events are automatically forwarded to your configured ERP endpoint.
        </p>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>message.sent - When message is sent to WhatsApp servers</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>message.delivered - When message is delivered to recipient</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>message.read - When recipient reads the message</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>message.failed - When message delivery fails</span>
          </div>
        </div>
      </div>
    </div>
  );
}