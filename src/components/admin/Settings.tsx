import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';

export function Settings() {
  const [activeTab, setActiveTab] = useState('branding');

  const tabs = [
    { id: 'branding', label: 'Branding' },
    { id: 'alerts', label: 'Alerts & Notifications' },
    { id: 'data-retention', label: 'Data Retention' },
    { id: 'integrations', label: 'Integrations' },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-white mb-2">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Configure platform branding, alerts, data retention, and integration settings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <h3 className="text-slate-900 dark:text-white mb-6">Platform Branding</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                defaultValue="WhatsApp Admin Portal"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Support Email
              </label>
              <input
                type="email"
                defaultValue="support@enterprise.com"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Logo URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  defaultValue="#2563eb"
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  defaultValue="#2563eb"
                  className="flex-1 px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Favicon URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/favicon.ico"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Save className="w-4 h-4" />
            Save Branding
          </button>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <h3 className="text-slate-900 dark:text-white mb-6">Alert & Notification Settings</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm text-slate-900 dark:text-white mb-4">Email Notifications</h4>
              <div className="space-y-3">
                {[
                  'System health alerts',
                  'Failed login attempts',
                  'Quota threshold warnings',
                  'Template approval updates',
                  'WABA connection issues',
                  'Database performance warnings',
                ].map((notification) => (
                  <label key={notification} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{notification}</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-gray-800">
              <h4 className="text-sm text-slate-900 dark:text-white mb-4">Alert Thresholds</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                    Queue Size Alert Threshold
                  </label>
                  <input
                    type="number"
                    defaultValue="5000"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Alert when queue size exceeds this number</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                    Failed Message Rate (%)
                  </label>
                  <input
                    type="number"
                    defaultValue="5"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Alert when failure rate exceeds this percentage</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                    Webhook Failure Threshold
                  </label>
                  <input
                    type="number"
                    defaultValue="10"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Alert after this many consecutive failures</p>
                </div>
              </div>
            </div>
          </div>
          <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Save className="w-4 h-4" />
            Save Alert Settings
          </button>
        </div>
      )}

      {/* Data Retention Tab */}
      {activeTab === 'data-retention' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <h3 className="text-slate-900 dark:text-white mb-6">Data Retention Policies</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Message History Retention
              </label>
              <select className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                <option>30 days</option>
                <option>60 days</option>
                <option selected>90 days</option>
                <option>6 months</option>
                <option>1 year</option>
                <option>Forever</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">How long to keep message records and metadata</p>
            </div>
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Audit Log Retention
              </label>
              <select className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                <option>30 days</option>
                <option>60 days</option>
                <option selected>90 days</option>
                <option>1 year</option>
                <option>Forever</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Audit logs retention for compliance</p>
            </div>
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Webhook Event Logs
              </label>
              <select className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                <option>7 days</option>
                <option>14 days</option>
                <option selected>30 days</option>
                <option>60 days</option>
                <option>90 days</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Webhook delivery logs and payloads</p>
            </div>
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                Archived Tenant Data
              </label>
              <select className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
                <option>30 days after deletion</option>
                <option>60 days after deletion</option>
                <option selected>90 days after deletion</option>
                <option>1 year after deletion</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Keep deleted tenant data for recovery purposes</p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-gray-800">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-900 dark:text-yellow-200 mb-1">
                    Data Retention Warning
                  </p>
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    Ensure retention policies comply with your data protection regulations (GDPR, CCPA, etc.). 
                    Shorter retention periods may impact historical reporting and compliance audits.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Save className="w-4 h-4" />
            Save Retention Settings
          </button>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <h3 className="text-slate-900 dark:text-white mb-6">External Integrations</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm text-slate-900 dark:text-white mb-4">Monitoring & Observability</h4>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm text-slate-900 dark:text-white">Datadog</h5>
                    <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    Send metrics and logs to Datadog for monitoring
                  </p>
                  <input
                    type="text"
                    placeholder="Datadog API Key"
                    defaultValue="••••••••••••••••"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm text-slate-900 dark:text-white">Sentry</h5>
                    <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 rounded-full">
                      Not Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    Error tracking and performance monitoring
                  </p>
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Configure Sentry
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-gray-800">
              <h4 className="text-sm text-slate-900 dark:text-white mb-4">Alerting</h4>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm text-slate-900 dark:text-white">Slack</h5>
                    <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    Receive system alerts in Slack channel
                  </p>
                  <input
                    type="text"
                    placeholder="Webhook URL"
                    defaultValue="https://hooks.slack.com/services/..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm text-slate-900 dark:text-white">PagerDuty</h5>
                    <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 rounded-full">
                      Not Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    On-call incident management and escalation
                  </p>
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Configure PagerDuty
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Save className="w-4 h-4" />
            Save Integration Settings
          </button>
        </div>
      )}
    </div>
  );
}
