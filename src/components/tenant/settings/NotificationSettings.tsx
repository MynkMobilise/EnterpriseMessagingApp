import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../utils/api';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { EmailNotificationsForm } from './EmailNotificationsForm';
import { AlertThresholdsForm } from './AlertThresholdsForm';

export function NotificationSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Email Notifications
  const [emailNotifications, setEmailNotifications] = useState({
    messageDeliveryReports: true,
    templateStatusUpdates: true,
    quotaWarnings: false,
    systemUpdates: true,
  });

  // Alert Thresholds
  const [failedMessageThreshold, setFailedMessageThreshold] = useState('10% failure rate');
  const [apiErrorThreshold, setApiErrorThreshold] = useState('After 25 errors');

  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (!currentOrganization) return;
    loadSettings();
  }, [currentOrganization?.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.settings.getOrganization();
      console.log('NotificationSettings - Load response:', response);
      if (response.success && response.data) {
        const settings = response.data;
        // Load notification preferences from settings
        setEmailNotifications({
          messageDeliveryReports: settings.emailNotifications !== false,
          templateStatusUpdates: settings.emailNotifications !== false,
          quotaWarnings: settings.quotaWarnings || false,
          systemUpdates: settings.emailNotifications !== false,
        });
        setFailedMessageThreshold(settings.failedMessageThreshold || '10% failure rate');
        setApiErrorThreshold(settings.apiErrorThreshold || 'After 25 errors');
      }
    } catch (error: any) {
      console.error('Failed to load notification settings:', error);
      toast.error('Failed to load notification settings', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const settingsData: any = {
        emailNotifications: emailNotifications.messageDeliveryReports || emailNotifications.templateStatusUpdates || emailNotifications.systemUpdates,
        quotaWarnings: emailNotifications.quotaWarnings,
        failedMessageThreshold: failedMessageThreshold || null,
        apiErrorThreshold: apiErrorThreshold || null,
      };

      console.log('NotificationSettings - Saving:', settingsData);
      const response = await apiService.settings.updateOrganization(settingsData);
      console.log('NotificationSettings - Save response:', response);
      
      if (response.success) {
        toast.success('Notification settings saved successfully');
        // Reload settings to reflect changes
        await loadSettings();
      } else {
        throw new Error(response.error?.message || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Failed to save notification settings:', error);
      toast.error('Failed to save notification settings', {
        description: error.response?.data?.error?.message || error.message || 'An unexpected error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading notification settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmailNotificationsForm
        emailNotifications={emailNotifications}
        onEmailNotificationsChange={setEmailNotifications}
      />

      <AlertThresholdsForm
        failedMessageThreshold={failedMessageThreshold}
        apiErrorThreshold={apiErrorThreshold}
        onFailedMessageThresholdChange={setFailedMessageThreshold}
        onApiErrorThresholdChange={setApiErrorThreshold}
      />

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Notification Settings'}
        </button>
      </div>
    </div>
  );
}

