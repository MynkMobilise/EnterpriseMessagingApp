import { AlertCircle } from 'lucide-react';

interface AlertThresholdsFormProps {
  failedMessageThreshold: string;
  apiErrorThreshold: string;
  onFailedMessageThresholdChange: (value: string) => void;
  onApiErrorThresholdChange: (value: string) => void;
}

export function AlertThresholdsForm({
  failedMessageThreshold,
  apiErrorThreshold,
  onFailedMessageThresholdChange,
  onApiErrorThresholdChange,
}: AlertThresholdsFormProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg text-gray-900 dark:text-white">Alert Thresholds</h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Failed Message Alert Threshold
          </label>
          <select
            value={failedMessageThreshold}
            onChange={(e) => onFailedMessageThresholdChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="5% failure rate">5% failure rate</option>
            <option value="10% failure rate">10% failure rate</option>
            <option value="15% failure rate">15% failure rate</option>
            <option value="20% failure rate">20% failure rate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            API Error Alert Threshold
          </label>
          <select
            value={apiErrorThreshold}
            onChange={(e) => onApiErrorThresholdChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="After 10 errors">After 10 errors</option>
            <option value="After 25 errors">After 25 errors</option>
            <option value="After 50 errors">After 50 errors</option>
            <option value="After 100 errors">After 100 errors</option>
          </select>
        </div>
      </div>
    </div>
  );
}

