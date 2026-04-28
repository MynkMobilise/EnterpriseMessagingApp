import { Bell } from 'lucide-react';

interface EmailNotificationsFormProps {
  emailNotifications: {
    messageDeliveryReports: boolean;
    templateStatusUpdates: boolean;
    quotaWarnings: boolean;
    systemUpdates: boolean;
  };
  onEmailNotificationsChange: (notifications: EmailNotificationsFormProps['emailNotifications']) => void;
}

export function EmailNotificationsForm({
  emailNotifications,
  onEmailNotificationsChange,
}: EmailNotificationsFormProps) {
  const updateNotification = (key: keyof EmailNotificationsFormProps['emailNotifications'], value: boolean) => {
    onEmailNotificationsChange({
      ...emailNotifications,
      [key]: value,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg text-gray-900 dark:text-white">Email Notifications</h3>
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={emailNotifications.messageDeliveryReports}
            onChange={(e) => updateNotification('messageDeliveryReports', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300 block">
              Message Delivery Reports
            </span>
            <span className="text-xs text-gray-500">Daily summary of message delivery status</span>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={emailNotifications.templateStatusUpdates}
            onChange={(e) => updateNotification('templateStatusUpdates', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300 block">
              Template Status Updates
            </span>
            <span className="text-xs text-gray-500">
              When templates are approved or rejected by Meta
            </span>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={emailNotifications.quotaWarnings}
            onChange={(e) => updateNotification('quotaWarnings', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300 block">
              Quota Warnings
            </span>
            <span className="text-xs text-gray-500">
              Alert when approaching messaging limits
            </span>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={emailNotifications.systemUpdates}
            onChange={(e) => updateNotification('systemUpdates', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300 block">
              System Updates
            </span>
            <span className="text-xs text-gray-500">Platform updates and maintenance notices</span>
          </div>
        </label>
      </div>
    </div>
  );
}

