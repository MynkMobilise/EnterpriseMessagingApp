import { useState, useEffect } from 'react';
import { Save, Key, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../utils/api';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { TwoFactorAuthForm } from './TwoFactorAuthForm';
import { IPWhitelistingForm } from './IPWhitelistingForm';
import { PasswordSessionForm } from './PasswordSessionForm';

export function SecuritySettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [ipWhitelisting, setIpWhitelisting] = useState(false);
  const [ipAddresses, setIpAddresses] = useState<string[]>([]);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState(90);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);

  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (!currentOrganization) return;
    loadSettings();
  }, [currentOrganization?.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.settings.getOrganization();
      console.log('SecuritySettings - Load response:', response);
      if (response.success && response.data) {
        const settings = response.data;
        setTwoFactorEnabled(settings.twoFactorRequired || false);
        const ipList = settings.ipWhitelist || [];
        setIpWhitelisting(ipList.length > 0);
        setIpAddresses(ipList.length > 0 ? ipList : ['']);
        setPasswordExpiryDays(settings.passwordExpiryDays || 90);
        setSessionTimeoutMinutes(settings.sessionTimeoutMinutes || 60);
      }
    } catch (error: any) {
      console.error('Failed to load security settings:', error);
      toast.error('Failed to load security settings', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Filter out empty IP addresses
      const validIpAddresses = ipAddresses.filter(ip => ip.trim() !== '');
      
      const settingsData: any = {
        twoFactorRequired: twoFactorEnabled,
        passwordExpiryDays,
        sessionTimeoutMinutes,
      };

      // Only include IP whitelist if enabled and has valid IPs
      if (ipWhitelisting && validIpAddresses.length > 0) {
        settingsData.ipWhitelist = validIpAddresses;
      } else if (!ipWhitelisting) {
        settingsData.ipWhitelist = null;
      }

      console.log('SecuritySettings - Saving:', settingsData);
      const response = await apiService.settings.updateOrganization(settingsData);
      console.log('SecuritySettings - Save response:', response);
      
      if (response.success) {
        toast.success('Security settings saved successfully');
        // Reload settings to reflect changes
        await loadSettings();
      } else {
        throw new Error(response.error?.message || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Failed to save security settings:', error);
      toast.error('Failed to save security settings', {
        description: error.response?.data?.error?.message || error.message || 'An unexpected error occurred',
      });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading security settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TwoFactorAuthForm
        enabled={twoFactorEnabled}
        onEnabledChange={setTwoFactorEnabled}
      />

      {/* API Key Security */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg text-gray-900 dark:text-white mb-1">API Key Security</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure security settings for your API keys
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300 block">
                  Require API Key Rotation
                </span>
                <span className="text-xs text-gray-500">
                  Force API key renewal every 90 days
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300 block">
                  Alert on API Key Usage from New IPs
                </span>
                <span className="text-xs text-gray-500">
                  Get notified when API keys are used from unrecognized IP addresses
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300 block">
                  Disable Inactive API Keys
                </span>
                <span className="text-xs text-gray-500">
                  Automatically disable API keys not used for 30 days
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <IPWhitelistingForm
        enabled={ipWhitelisting}
        ipAddresses={ipAddresses}
        onEnabledChange={setIpWhitelisting}
        onIpAddressesChange={setIpAddresses}
      />

      <PasswordSessionForm
        passwordExpiryDays={passwordExpiryDays}
        sessionTimeoutMinutes={sessionTimeoutMinutes}
        onPasswordExpiryDaysChange={setPasswordExpiryDays}
        onSessionTimeoutMinutesChange={setSessionTimeoutMinutes}
      />

      {/* Webhook Security */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg text-gray-900 dark:text-white mb-4">Webhook Security</h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300 block">
                  Verify Webhook Signatures
                </span>
                <span className="text-xs text-gray-500">
                  Validate incoming webhook requests using HMAC signatures
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300 block">
                  Use HTTPS Only for Webhooks
                </span>
                <span className="text-xs text-gray-500">
                  Reject webhook URLs that don't use HTTPS
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Webhook Retry Attempts
            </label>
            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white">
              <option>3 attempts</option>
              <option>5 attempts</option>
              <option>10 attempts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Alerts */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-gray-900 dark:text-white mb-2">Security Best Practices</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Rotate your API keys regularly</li>
              <li>• Use environment variables to store sensitive credentials</li>
              <li>• Enable IP whitelisting for production environments</li>
              <li>• Monitor your API usage for suspicious activity</li>
              <li>• Keep your webhook verify tokens secure</li>
            </ul>
          </div>
        </div>
      </div>


      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Security Settings'}
        </button>
      </div>
    </div>
  );
}
