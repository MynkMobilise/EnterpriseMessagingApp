import { useState } from 'react';
import { Eye, EyeOff, Copy, Key } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../utils/api';

interface CustomSMSProviderFormProps {
  apiUrl: string;
  apiUser: string;
  apiKey: string;
  entityId: string;
  accUsage: string;
  showApiKey: boolean;
  onApiUrlChange: (value: string) => void;
  onApiUserChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onEntityIdChange: (value: string) => void;
  onAccUsageChange: (value: string) => void;
  onToggleShowApiKey: () => void;
}

export function CustomSMSProviderForm({
  apiUrl,
  apiUser,
  apiKey,
  entityId,
  accUsage,
  showApiKey,
  onApiUrlChange,
  onApiUserChange,
  onApiKeyChange,
  onEntityIdChange,
  onAccUsageChange,
  onToggleShowApiKey,
}: CustomSMSProviderFormProps) {
  const [storedApiKey, setStoredApiKey] = useState<string | null>(null);
  const [loadingStoredKey, setLoadingStoredKey] = useState(false);
  const [showStoredKey, setShowStoredKey] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const fetchStoredApiKey = async () => {
    try {
      setLoadingStoredKey(true);
      const response = await apiService.settings.getCustomSmsApiKey();
      if (response.success && response.data?.apiKey) {
        setStoredApiKey(response.data.apiKey);
        setShowStoredKey(true);
        toast.success('API Key loaded');
      } else {
        toast.error('No API Key found', {
          description: 'No API Key is currently stored in the system',
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch stored API key:', error);
      toast.error('Failed to load API Key', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoadingStoredKey(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg text-gray-900 dark:text-white mb-4">Custom SMS Provider Configuration</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            API URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => onApiUrlChange(e.target.value)}
            placeholder="http://smsbhejo.org/submitsms.jsp"
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            The base URL for your SMS gateway API endpoint
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            API Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={apiUser}
            onChange={(e) => onApiUserChange(e.target.value)}
            placeholder="Enter API Username"
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            API Key <span className="text-red-500">*</span>
          </label>
          
          {/* Show Stored API Key Section */}
          {storedApiKey && showStoredKey && (
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stored API Key:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStoredKey(!showStoredKey)}
                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                    title={showStoredKey ? 'Hide' : 'Show'}
                  >
                    {showStoredKey ? (
                      <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(storedApiKey, 'Stored API Key')}
                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                {showStoredKey ? storedApiKey : '••••••••••••••••'}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="Enter API Key (leave blank to keep existing)"
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
            <button
              onClick={onToggleShowApiKey}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={showApiKey ? 'Hide' : 'Show'}
            >
              {showApiKey ? (
                <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            {apiKey && (
              <button
                onClick={() => copyToClipboard(apiKey, 'API Key')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Copy"
              >
                <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <button
              onClick={fetchStoredApiKey}
              disabled={loadingStoredKey}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Show stored API Key"
            >
              <Key className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              {loadingStoredKey ? 'Loading...' : 'Show Stored'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to keep existing API Key. Click "Show Stored" to view the currently saved key.
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Entity ID (PE ID) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={entityId}
            onChange={(e) => onEntityIdChange(e.target.value)}
            placeholder="Enter Entity ID / PE ID"
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Provider-specific entity identifier
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Account Usage
          </label>
          <input
            type="text"
            value={accUsage}
            onChange={(e) => onAccUsageChange(e.target.value)}
            placeholder="1"
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Account usage flag (default: 1)
          </p>
        </div>
      </div>
    </div>
  );
}

