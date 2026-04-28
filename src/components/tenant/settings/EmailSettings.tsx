import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../utils/api';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { EmailConfigurationForm, EmailConfiguration } from './EmailConfigurationForm';

export function EmailSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configurations, setConfigurations] = useState<EmailConfiguration[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testingConfig, setTestingConfig] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [showTestDialog, setShowTestDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<EmailConfiguration>({
    name: '',
    provider: 'smtp',
    emailFromAddress: '',
    emailFromName: '',
    emailApiKeyEncrypted: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUsername: '',
    smtpPasswordEncrypted: '',
    isDefault: false,
    isFallback: false,
    priority: 0,
    status: 'active',
    tlsOptions: {
      rejectUnauthorized: true, // Default: secure
    },
  });

  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (!currentOrganization) return;
    loadConfigurations();
  }, [currentOrganization?.id]);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const response = await apiService.emailConfigurations.list();
      if (response.success && response.data) {
        setConfigurations(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load email configurations', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const response = await apiService.emailConfigurations.getById(id);
      if (response.success && response.data) {
        const config = response.data;
        setFormData({
          ...config,
          emailApiKeyEncrypted: '', // Don't show encrypted value
          smtpPasswordEncrypted: '', // Don't show encrypted value
          tlsOptions: config.tlsOptions || { rejectUnauthorized: true }, // Default if not set
        });
        setEditingId(id);
        setShowForm(true);
      }
    } catch (error: any) {
      toast.error('Failed to load configuration', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await apiService.emailConfigurations.delete(id);
      if (response.success) {
        toast.success('Configuration deleted successfully');
        await loadConfigurations();
      }
    } catch (error: any) {
      toast.error('Failed to delete configuration', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const submitData = { ...formData };
      
      // Only include API key/password if provided
      if (!submitData.emailApiKeyEncrypted || submitData.emailApiKeyEncrypted.trim() === '') {
        delete submitData.emailApiKeyEncrypted;
      }
      if (!submitData.smtpPasswordEncrypted || submitData.smtpPasswordEncrypted.trim() === '') {
        delete submitData.smtpPasswordEncrypted;
      }

      let response;
      if (editingId) {
        response = await apiService.emailConfigurations.update(editingId, submitData);
      } else {
        response = await apiService.emailConfigurations.create(submitData);
      }

      if (response.success) {
        toast.success(`Configuration ${editingId ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingId(null);
        resetForm();
        await loadConfigurations();
      }
    } catch (error: any) {
      toast.error(`Failed to ${editingId ? 'update' : 'create'} configuration`, {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'smtp',
      emailFromAddress: '',
      emailFromName: '',
      emailApiKeyEncrypted: '',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: true,
      smtpUsername: '',
      smtpPasswordEncrypted: '',
      isDefault: false,
      isFallback: false,
      priority: 0,
      status: 'active',
      tlsOptions: {
        rejectUnauthorized: true,
      },
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const handleTestConfiguration = (id: string) => {
    setTestingConfig(id);
    setTestEmail('');
    setShowTestDialog(true);
  };

  const handleTestSubmit = async () => {
    if (!testEmail || !testingConfig) return;

    try {
      setSaving(true);
      const response = await apiService.emailConfigurations.test(testingConfig, testEmail);
      
      if (response.success) {
        toast.success('Test email sent successfully!', {
          description: `Test email sent to ${testEmail} using configuration "${response.data.configuration.name}"`,
        });
        setShowTestDialog(false);
        setTestEmail('');
        setTestingConfig(null);
      }
    } catch (error: any) {
      toast.error('Failed to send test email', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && configurations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Configurations</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage multiple email provider configurations and set default/fallback channels
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Configuration
          </button>
        )}
      </div>

      {showForm && (
        <EmailConfigurationForm
          formData={formData}
          editingId={editingId}
          saving={saving}
          showApiKey={showApiKey}
          showPassword={showPassword}
          onFormDataChange={setFormData}
          onShowApiKeyToggle={() => setShowApiKey(!showApiKey)}
          onShowPasswordToggle={() => setShowPassword(!showPassword)}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onTestConfiguration={handleTestConfiguration}
        />
      )}

      {/* Configurations Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">From Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {configurations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No email configurations found</p>
                    <p className="text-sm mt-2">Click "Add Configuration" to create one</p>
                  </td>
                </tr>
              ) : (
                configurations.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {config.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {config.provider.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {config.emailFromAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col gap-1">
                        {config.isDefault && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 w-fit">
                            Default
                          </span>
                        )}
                        {config.isFallback && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 w-fit">
                            Fallback
                          </span>
                        )}
                        {!config.isDefault && !config.isFallback && (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        config.status === 'active' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : config.status === 'testing'
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}>
                        {config.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {config.priority || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(config.id!)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(config.id!)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
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

      {/* Test Configuration Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Test Email Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">A test email will be sent to this address</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTestDialog(false);
                  setTestEmail('');
                  setTestingConfig(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTestSubmit}
                disabled={!testEmail || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
