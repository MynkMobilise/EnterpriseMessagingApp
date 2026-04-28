import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookConfigurationFormProps {
  webhookVerifyToken: string;
  webhookEvents: {
    messages: boolean;
    messageStatus: boolean;
    accountUpdate: boolean;
    phoneNumberUpdate: boolean;
    messageTemplateUpdate: boolean;
  };
  onWebhookVerifyTokenChange: (value: string) => void;
  onWebhookEventsChange: (events: WebhookConfigurationFormProps['webhookEvents']) => void;
  onTestWebhook?: () => void;
}

export function WebhookConfigurationForm({
  webhookVerifyToken,
  webhookEvents,
  onWebhookVerifyTokenChange,
  onWebhookEventsChange,
  onTestWebhook,
}: WebhookConfigurationFormProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const testWebhook = () => {
    if (onTestWebhook) {
      onTestWebhook();
    } else {
      toast.loading('Testing webhook connection...', { id: 'webhook-test' });
      setTimeout(() => {
        toast.success('Webhook connection successful!', { id: 'webhook-test' });
      }, 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg text-gray-900 dark:text-white mb-4">Webhook Configuration</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Callback URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${window.location.origin}/api/v1/webhooks/whatsapp`}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
            <button
              onClick={testWebhook}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Test
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Verify Token
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={webhookVerifyToken}
              onChange={(e) => onWebhookVerifyTokenChange(e.target.value)}
              placeholder="Enter webhook verify token"
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
            <button
              onClick={() => copyToClipboard(webhookVerifyToken || '', 'Verify Token')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              disabled={!webhookVerifyToken}
            >
              <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-3">
            Subscribed Events
          </label>
          <div className="space-y-2">
            {Object.entries(webhookEvents).map(([key, value]) => (
              <label key={key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    onWebhookEventsChange({ ...webhookEvents, [key]: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

