import { Eye, EyeOff, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface MetaBusinessAccountFormProps {
  businessAccountId: string;
  phoneNumberId: string;
  apiVersion: string;
  accessToken: string;
  showApiKey: boolean;
  onBusinessAccountIdChange: (value: string) => void;
  onPhoneNumberIdChange: (value: string) => void;
  onApiVersionChange: (value: string) => void;
  onAccessTokenChange: (value: string) => void;
  onToggleShowApiKey: () => void;
}

export function MetaBusinessAccountForm({
  businessAccountId,
  phoneNumberId,
  apiVersion,
  accessToken,
  showApiKey,
  onBusinessAccountIdChange,
  onPhoneNumberIdChange,
  onApiVersionChange,
  onAccessTokenChange,
  onToggleShowApiKey,
}: MetaBusinessAccountFormProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg text-gray-900 dark:text-white mb-4">Meta Business Account</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Business Manager ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={businessAccountId}
                onChange={(e) => onBusinessAccountIdChange(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <button
                onClick={() => copyToClipboard(businessAccountId || '', 'Business Manager ID')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                disabled={!businessAccountId}
              >
                <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              App ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => onPhoneNumberIdChange(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <button
                onClick={() => copyToClipboard(phoneNumberId || '', 'App ID')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                disabled={!phoneNumberId}
              >
                <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            API Version
          </label>
          <select
            value={apiVersion}
            onChange={(e) => onApiVersionChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="v18.0">v18.0</option>
            <option value="v17.0">v17.0</option>
            <option value="v16.0">v16.0</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            System User Access Token
          </label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={accessToken}
              onChange={(e) => onAccessTokenChange(e.target.value)}
              placeholder="Enter WhatsApp access token"
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
            <button
              onClick={onToggleShowApiKey}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {showApiKey ? (
                <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <button
              onClick={() => copyToClipboard(accessToken || '', 'Access Token')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              disabled={!accessToken}
            >
              <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Never-expiring access token from Meta Business Settings. Token is encrypted when saved.
          </p>
        </div>
      </div>
    </div>
  );
}

