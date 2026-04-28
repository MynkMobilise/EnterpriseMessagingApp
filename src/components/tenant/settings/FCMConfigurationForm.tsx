import { Eye, EyeOff, AlertCircle, Save, RefreshCw } from 'lucide-react';

interface FCMConfigurationFormProps {
  projectId: string;
  serverKey: string;
  showServerKey: boolean;
  saving: boolean;
  onProjectIdChange: (value: string) => void;
  onServerKeyChange: (value: string) => void;
  onToggleShowServerKey: () => void;
  onSave: () => void;
}

export function FCMConfigurationForm({
  projectId,
  serverKey,
  showServerKey,
  saving,
  onProjectIdChange,
  onServerKeyChange,
  onToggleShowServerKey,
  onSave,
}: FCMConfigurationFormProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
      {/* Project ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Firebase Project ID
        </label>
        <input
          type="text"
          value={projectId}
          onChange={(e) => onProjectIdChange(e.target.value)}
          placeholder="your-project-id"
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your Firebase project ID (optional, used for reference)
        </p>
      </div>

      {/* Server Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          FCM Server Key <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showServerKey ? 'text' : 'password'}
            value={serverKey}
            onChange={(e) => onServerKeyChange(e.target.value)}
            placeholder="Enter FCM server key"
            className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={onToggleShowServerKey}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {showServerKey ? (
              <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Server key from Firebase Console → Project Settings → Cloud Messaging
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 dark:text-blue-200 font-medium mb-1">
              How to Get Your FCM Server Key
            </p>
            <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Go to Firebase Console (console.firebase.google.com)</li>
              <li>Select your project</li>
              <li>Navigate to Project Settings → Cloud Messaging</li>
              <li>Copy the "Server key" under Cloud Messaging API (Legacy)</li>
              <li>Paste it in the field above</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onSave}
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
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

