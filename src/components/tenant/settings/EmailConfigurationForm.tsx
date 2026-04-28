import { Eye, EyeOff, Mail, Save, RefreshCw, X } from 'lucide-react';

export interface EmailConfiguration {
  id?: string;
  name: string;
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'other';
  emailFromAddress: string;
  emailFromName?: string;
  emailApiKeyEncrypted?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPasswordEncrypted?: string;
  isDefault?: boolean;
  isFallback?: boolean;
  priority?: number;
  status?: 'active' | 'inactive' | 'testing';
  tlsOptions?: {
    rejectUnauthorized?: boolean;
  };
}

interface EmailConfigurationFormProps {
  formData: EmailConfiguration;
  editingId: string | null;
  saving: boolean;
  showApiKey: boolean;
  showPassword: boolean;
  onFormDataChange: (data: EmailConfiguration) => void;
  onShowApiKeyToggle: () => void;
  onShowPasswordToggle: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onTestConfiguration?: (id: string) => void;
}

export function EmailConfigurationForm({
  formData,
  editingId,
  saving,
  showApiKey,
  showPassword,
  onFormDataChange,
  onShowApiKeyToggle,
  onShowPasswordToggle,
  onSubmit,
  onCancel,
  onTestConfiguration,
}: EmailConfigurationFormProps) {
  const updateField = (field: keyof EmailConfiguration, value: any) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingId ? 'Edit Email Configuration' : 'Add Email Configuration'}
        </h4>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Configuration Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Primary SendGrid"
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Provider <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.provider}
              onChange={(e) => updateField('provider', e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="smtp">SMTP</option>
              <option value="sendgrid">SendGrid</option>
              <option value="ses">AWS SES</option>
              <option value="mailgun">Mailgun</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* From Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.emailFromAddress}
              onChange={(e) => updateField('emailFromAddress', e.target.value)}
              placeholder="noreply@yourcompany.com"
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* From Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Name
            </label>
            <input
              type="text"
              value={formData.emailFromName || ''}
              onChange={(e) => updateField('emailFromName', e.target.value)}
              placeholder="Your Company Name"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* SMTP-specific fields - Only show when provider is SMTP */}
          {formData.provider === 'smtp' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SMTP Host <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.smtpHost || ''}
                  onChange={(e) => updateField('smtpHost', e.target.value)}
                  placeholder="smtp.gmail.com"
                  required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SMTP Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.smtpPort || 587}
                  onChange={(e) => updateField('smtpPort', parseInt(e.target.value))}
                  placeholder="587"
                  required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={formData.smtpUsername || ''}
                  onChange={(e) => updateField('smtpUsername', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SMTP Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.smtpPasswordEncrypted || ''}
                    onChange={(e) => updateField('smtpPasswordEncrypted', e.target.value)}
                    placeholder={editingId ? "Leave blank to keep existing" : "Enter SMTP password"}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={onShowPasswordToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={formData.smtpSecure !== false}
                  onChange={(e) => updateField('smtpSecure', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="smtpSecure" className="text-sm text-gray-700 dark:text-gray-300">
                  Use secure connection (TLS/SSL)
                </label>
              </div>

              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <input
                  type="checkbox"
                  id="tlsRejectUnauthorized"
                  checked={formData.tlsOptions?.rejectUnauthorized !== false}
                  onChange={(e) => updateField('tlsOptions', { 
                    ...formData.tlsOptions, 
                    rejectUnauthorized: e.target.checked 
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
                />
                <div className="flex-1">
                  <label htmlFor="tlsRejectUnauthorized" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Verify SSL/TLS Certificate
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Uncheck this only for corporate mail servers with self-signed certificates (e.g., mail.mobilisepro.com). 
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium"> Security risk if disabled.</span>
                  </p>
                </div>
              </div>
            </>
          )}

          {/* API Key for non-SMTP providers */}
          {formData.provider !== 'smtp' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key {editingId && <span className="text-xs text-gray-500">(leave blank to keep existing)</span>}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.emailApiKeyEncrypted || ''}
                  onChange={(e) => updateField('emailApiKeyEncrypted', e.target.value)}
                  placeholder={editingId ? "Leave blank to keep existing" : "Enter API key"}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={onShowApiKeyToggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {showApiKey ? (
                    <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status || 'active'}
              onChange={(e) => updateField('status', e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="testing">Testing</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <input
              type="number"
              value={formData.priority || 0}
              onChange={(e) => updateField('priority', parseInt(e.target.value) || 0)}
              placeholder="0"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Lower number = higher priority</p>
          </div>

          {/* Default */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault || false}
              onChange={(e) => updateField('isDefault', e.target.checked)}
              onClick={(e) => {
                if ((e.target as HTMLInputElement).checked) {
                  updateField('isFallback', false);
                }
              }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">
              Set as Default Channel
            </label>
          </div>

          {/* Fallback */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFallback"
              checked={formData.isFallback || false}
              onChange={(e) => updateField('isFallback', e.target.checked)}
              onClick={(e) => {
                if ((e.target as HTMLInputElement).checked) {
                  updateField('isDefault', false);
                }
              }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isFallback" className="text-sm text-gray-700 dark:text-gray-300">
              Set as Fallback Channel
            </label>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
          {editingId && onTestConfiguration && (
            <button
              type="button"
              onClick={() => onTestConfiguration(editingId)}
              className="px-4 py-2 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Test Configuration
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingId ? 'Update' : 'Create'} Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

