import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../utils/api';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { CustomSMSProviderForm } from './CustomSMSProviderForm';
import { SMSSenderIDForm } from './SMSSenderIDForm';
import { SMSSettingsForm } from './SMSSettingsForm';

export function SMSSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Custom Provider Settings
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [customApiUser, setCustomApiUser] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customEntityId, setCustomEntityId] = useState('');
  const [customAccUsage, setCustomAccUsage] = useState('1');
  const [showCustomApiKey, setShowCustomApiKey] = useState(false);
  
  // Sender ID
  const [smsSenderId, setSmsSenderId] = useState('');
  
  // SMS Settings
  const [deliveryReceipts, setDeliveryReceipts] = useState(true);
  const [urlShortening, setUrlShortening] = useState(true);
  const [unicodeSupport, setUnicodeSupport] = useState(false);
  const [messageValidity, setMessageValidity] = useState('5 minutes');
  const [rateLimit, setRateLimit] = useState(10);

  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (!currentOrganization) return;
    loadSettings();
  }, [currentOrganization?.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.settings.getOrganization();
      console.log('SMSSettings - Load response:', JSON.stringify(response, null, 2));
      if (response.success && response.data) {
        const settings = response.data;
        const customSettings = settings.customSettings || {};
        console.log('SMSSettings - customSettings:', JSON.stringify(customSettings, null, 2));
        
        setSmsSenderId(settings.smsSenderId || '');

        // Load custom provider settings (always load, as we only support custom provider now)
        // Try top-level first (extracted by backend), then fallback to customSettings
        const apiUrl = ('customApiUrl' in settings && settings.customApiUrl !== undefined) 
          ? String(settings.customApiUrl) 
          : (('customApiUrl' in customSettings && customSettings.customApiUrl !== undefined) 
            ? String(customSettings.customApiUrl) 
            : '');
        
        const apiUser = ('customApiUser' in settings && settings.customApiUser !== undefined) 
          ? String(settings.customApiUser) 
          : (('customApiUser' in customSettings && customSettings.customApiUser !== undefined) 
            ? String(customSettings.customApiUser) 
            : '');
        
        const entityId = ('customEntityId' in settings && settings.customEntityId !== undefined) 
          ? String(settings.customEntityId) 
          : (('customEntityId' in customSettings && customSettings.customEntityId !== undefined) 
            ? String(customSettings.customEntityId) 
            : '');
        
        const accUsage = ('customAccUsage' in settings && settings.customAccUsage !== undefined) 
          ? String(settings.customAccUsage) 
          : (('customAccUsage' in customSettings && customSettings.customAccUsage !== undefined) 
            ? String(customSettings.customAccUsage) 
            : '1');
        
        setCustomApiUrl(apiUrl);
        setCustomApiUser(apiUser);
        setCustomApiKey(''); // Don't load encrypted key
        setCustomEntityId(entityId);
        setCustomAccUsage(accUsage);
        
        console.log('SMSSettings - Loaded custom provider settings:', { apiUrl, apiUser, entityId, accUsage });
      }
    } catch (error: any) {
      console.error('Failed to load SMS settings:', error);
      toast.error('Failed to load SMS settings', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      // Note: customApiKey is only required if it's a new configuration or being updated
      // If it's empty but settings already exist, we'll preserve the existing encrypted key
      if (!customApiUrl || !customApiUser || !customEntityId) {
        toast.error('Please fill all required fields for custom provider', {
          description: 'API URL, API Username, and Entity ID are required',
        });
        setSaving(false);
        return;
      }
      
      // If API key is empty, check if we have existing settings with a key
      // If no key exists and user is trying to save, show error
      if (!customApiKey || customApiKey.trim() === '') {
        const response = await apiService.settings.getOrganization();
        const existingSettings = response.success && response.data ? response.data : {};
        const existingCustomSettings = existingSettings.customSettings || {};
        const hasExistingKey = existingCustomSettings.customApiKey && existingCustomSettings.customApiKey.trim() !== '';
        
        if (!hasExistingKey) {
          toast.error('API Key is required', {
            description: 'Please enter your API Key for the custom SMS provider',
          });
          setSaving(false);
          return;
        }
        // If existing key exists, we'll skip updating it (backend will preserve it)
      }

      // First, get current settings to preserve existing customSettings
      const currentResponse = await apiService.settings.getOrganization();
      const currentSettings = currentResponse.success && currentResponse.data ? currentResponse.data : {};
      const existingCustomSettings = currentSettings.customSettings || {};
      
      // Always set smsProvider to 'other' for custom provider
      const settingsData: any = {
        smsProvider: 'other',
        smsSenderId: smsSenderId || null,
      };

      // Store custom provider settings in customSettings
      settingsData.customSettings = {
        ...existingCustomSettings,
        customApiUrl: customApiUrl.trim(),
        customApiUser: customApiUser.trim(),
        customEntityId: customEntityId.trim(),
        customAccUsage: customAccUsage || '1',
      };

      // Store API key separately (will be encrypted by backend)
      // Only send if it's provided (not empty) - if empty, backend will preserve existing encrypted key
      if (customApiKey && customApiKey.trim() !== '') {
        settingsData.customApiKey = customApiKey.trim();
      }
      // If customApiKey is empty, don't include it in the request
      // The backend will preserve the existing encrypted key

      console.log('SMSSettings - Saving:', JSON.stringify(settingsData, null, 2));
      console.log('SMSSettings - Sending data:', JSON.stringify(settingsData, null, 2));
      const response = await apiService.settings.updateOrganization(settingsData);
      console.log('SMSSettings - Save response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        toast.success('SMS settings saved successfully');
        // Reload settings to reflect changes
        await loadSettings();
      } else {
        throw new Error(response.error?.message || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Failed to save SMS settings:', error);
      toast.error('Failed to save SMS settings', {
        description: error.response?.data?.error?.message || error.message || 'An unexpected error occurred',
      });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading SMS settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CustomSMSProviderForm
        apiUrl={customApiUrl}
        apiUser={customApiUser}
        apiKey={customApiKey}
        entityId={customEntityId}
        accUsage={customAccUsage}
        showApiKey={showCustomApiKey}
        onApiUrlChange={setCustomApiUrl}
        onApiUserChange={setCustomApiUser}
        onApiKeyChange={setCustomApiKey}
        onEntityIdChange={setCustomEntityId}
        onAccUsageChange={setCustomAccUsage}
        onToggleShowApiKey={() => setShowCustomApiKey(!showCustomApiKey)}
      />

      <SMSSenderIDForm
        senderId={smsSenderId}
        onSenderIdChange={setSmsSenderId}
      />

      <SMSSettingsForm
        deliveryReceipts={deliveryReceipts}
        urlShortening={urlShortening}
        unicodeSupport={unicodeSupport}
        messageValidity={messageValidity}
        rateLimit={rateLimit}
        onDeliveryReceiptsChange={setDeliveryReceipts}
        onUrlShorteningChange={setUrlShortening}
        onUnicodeSupportChange={setUnicodeSupport}
        onMessageValidityChange={setMessageValidity}
        onRateLimitChange={setRateLimit}
      />

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save SMS Settings'}
        </button>
      </div>
    </div>
  );
}
