interface SMSSettingsFormProps {
  deliveryReceipts: boolean;
  urlShortening: boolean;
  unicodeSupport: boolean;
  messageValidity: string;
  rateLimit: number;
  onDeliveryReceiptsChange: (value: boolean) => void;
  onUrlShorteningChange: (value: boolean) => void;
  onUnicodeSupportChange: (value: boolean) => void;
  onMessageValidityChange: (value: string) => void;
  onRateLimitChange: (value: number) => void;
}

export function SMSSettingsForm({
  deliveryReceipts,
  urlShortening,
  unicodeSupport,
  messageValidity,
  rateLimit,
  onDeliveryReceiptsChange,
  onUrlShorteningChange,
  onUnicodeSupportChange,
  onMessageValidityChange,
  onRateLimitChange,
}: SMSSettingsFormProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg text-gray-900 dark:text-white mb-4">SMS Settings</h3>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={deliveryReceipts}
              onChange={(e) => onDeliveryReceiptsChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300 block">
                Enable Delivery Receipts
              </span>
              <span className="text-xs text-gray-500">
                Track message delivery status (may incur additional charges)
              </span>
            </div>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={urlShortening}
              onChange={(e) => onUrlShorteningChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300 block">
                Enable URL Shortening
              </span>
              <span className="text-xs text-gray-500">
                Automatically shorten URLs in SMS messages
              </span>
            </div>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={unicodeSupport}
              onChange={(e) => onUnicodeSupportChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300 block">
                Enable Unicode Support
              </span>
              <span className="text-xs text-gray-500">
                Send messages with special characters (reduces character limit)
              </span>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Message Validity Period
          </label>
          <select
            value={messageValidity}
            onChange={(e) => onMessageValidityChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="5 minutes">5 minutes</option>
            <option value="1 hour">1 hour</option>
            <option value="6 hours">6 hours</option>
            <option value="24 hours">24 hours</option>
            <option value="72 hours">72 hours</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            How long the SMS gateway should attempt delivery
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Rate Limit (messages per minute)
          </label>
          <input
            type="number"
            value={rateLimit}
            onChange={(e) => onRateLimitChange(parseInt(e.target.value) || 10)}
            min="1"
            max="100"
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}

