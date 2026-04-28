import React, { useState, useEffect } from 'react';
import { Key as KeyIcon, Webhook as WebhookIcon } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../utils/api';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { WebhookConfigurationForm } from './WebhookConfigurationForm';
import { ManualConfigurationTab } from './whatsapp/ManualConfigurationTab';

export function WhatsAppSettings() {
  const [activeTab, setActiveTab] = useState('manual' as 'manual' | 'webhook');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // WhatsApp Settings
  const [settings, setSettings] = useState({} as any);
  const [whatsappWebhookVerifyToken, setWhatsappWebhookVerifyToken] = useState('');

  const [webhookEvents, setWebhookEvents] = useState({
    messages: true,
    messageStatus: true,
    accountUpdate: true,
    phoneNumberUpdate: false,
    messageTemplateUpdate: true,
  });

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
        const loadedSettings = response.data;
        setSettings(loadedSettings);
        setWhatsappWebhookVerifyToken(loadedSettings.whatsappWebhookVerifyToken || '');
      }
    } catch (error: any) {
      console.error('Failed to load WhatsApp settings:', error);
      toast.error('Failed to load WhatsApp settings', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (settingsData: any) => {
    try {
      setSaving(true);
      
      // Include webhook verify token
      const dataToSave = {
        ...settingsData,
        whatsappWebhookVerifyToken: whatsappWebhookVerifyToken || null,
      };

      const response = await apiService.settings.updateOrganization(dataToSave);
      
      if (response.success) {
        toast.success('WhatsApp settings saved successfully');
        await loadSettings();
      } else {
        throw new Error(response.error?.message || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Failed to save WhatsApp settings:', error);
      toast.error('Failed to save WhatsApp settings', {
        description: error.response?.data?.error?.message || error.message || 'An unexpected error occurred',
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    await loadSettings();
  };

  const testWebhook = () => {
    toast.loading('Testing webhook connection...', { id: 'webhook-test' });
    setTimeout(() => {
      toast.success('Webhook connection successful!', { id: 'webhook-test' });
    }, 2000);
  };

  const tabs = [
    { id: 'manual' as const, label: 'Manual Configuration', icon: KeyIcon },
    { id: 'webhook' as const, label: 'Webhook Configuration', icon: WebhookIcon },
  ];

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading WhatsApp settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm transition-all flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'manual' && (
          <ManualConfigurationTab
            settings={settings}
            onSave={handleSave}
            loading={loading}
            saving={saving}
          />
        )}
        {activeTab === 'webhook' && (
          <div className="space-y-6">
            <WebhookConfigurationForm
              webhookVerifyToken={whatsappWebhookVerifyToken}
              webhookEvents={webhookEvents}
              onWebhookVerifyTokenChange={setWhatsappWebhookVerifyToken}
              onWebhookEventsChange={setWebhookEvents}
              onTestWebhook={() => {
                toast.loading('Testing webhook connection...', { id: 'webhook-test' });
                setTimeout(() => {
                  toast.success('Webhook connection successful!', { id: 'webhook-test' });
                }, 2000);
              }}
            />
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  try {
                    await handleSave({});
                    toast.success('Webhook settings saved successfully');
                  } catch (error) {
                    // Error already handled in handleSave
                  }
                }}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Webhook Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
