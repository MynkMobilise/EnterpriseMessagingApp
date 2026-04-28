import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../utils/api';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { FCMConfigurationForm } from './FCMConfigurationForm';

export function FCMSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showServerKey, setShowServerKey] = useState(false);
  
  // FCM Settings
  const [fcmServerKeyEncrypted, setFcmServerKeyEncrypted] = useState('');
  const [fcmProjectId, setFcmProjectId] = useState('');

  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (!currentOrganization) return;
    loadSettings();
  }, [currentOrganization?.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.settings.getOrganization();
      if (response.success && response.data) {
        const settings = response.data;
        setFcmProjectId(settings.fcmProjectId || '');
        // Server key is encrypted, so we don't load it
        setFcmServerKeyEncrypted('');
      }
    } catch (error: any) {
      toast.error('Failed to load FCM settings', {
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
        fcmProjectId: fcmProjectId || null,
      };

      // Only include server key if provided (not empty)
      if (fcmServerKeyEncrypted && fcmServerKeyEncrypted.trim() !== '') {
        settingsData.fcmServerKeyEncrypted = fcmServerKeyEncrypted;
      }

      const response = await apiService.settings.updateOrganization(settingsData);
      
      if (response.success) {
        toast.success('FCM settings saved successfully');
        // Reload settings to get updated data
        await loadSettings();
        // Clear server key field after save
        setFcmServerKeyEncrypted('');
      } else {
        toast.error('Failed to save FCM settings', {
          description: response.error?.message || 'An unknown error occurred',
        });
      }
    } catch (error: any) {
      toast.error('Failed to save FCM settings', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">FCM Configuration</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure Firebase Cloud Messaging (FCM) for sending push notifications
        </p>
      </div>

      <FCMConfigurationForm
        projectId={fcmProjectId}
        serverKey={fcmServerKeyEncrypted}
        showServerKey={showServerKey}
        saving={saving}
        onProjectIdChange={setFcmProjectId}
        onServerKeyChange={setFcmServerKeyEncrypted}
        onToggleShowServerKey={() => setShowServerKey(!showServerKey)}
        onSave={handleSave}
      />
    </div>
  );
}

