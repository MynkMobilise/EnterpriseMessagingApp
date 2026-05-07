import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Copy, AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../../utils/api';

interface ManualConfigurationTabProps {
  settings: {
    whatsappBusinessAccountId?: string;
    whatsappPhoneNumberId?: string;
    whatsappApiVersion?: string;
    whatsappAccessToken?: string;
    whatsappAppId?: string;
    whatsappAppSecret?: string;
    whatsappWebhookVerifyToken?: string;
    whatsappWebhookUrl?: string;
    wabaLinkedVia?: string;
    // Backend never echoes the (encrypted) secrets back. These flags tell us
    // whether a value already exists in DB so the form can show a "Saved"
    // indicator instead of a blank field that looks like the value was lost.
    hasWhatsappAccessToken?: boolean;
    hasWhatsappAppSecret?: boolean;
  };
  onSave: (data: any) => Promise<void>;
  loading: boolean;
  saving: boolean;
}

export function ManualConfigurationTab({
  settings,
  onSave,
  loading,
  saving,
}: ManualConfigurationTabProps) {
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Whether each secret already lives in the DB. Drives the "Saved (Replace)"
  // affordance — when true, the user doesn't need to re-paste to keep it.
  const tokenAlreadySaved = !!settings.hasWhatsappAccessToken;
  const secretAlreadySaved = !!settings.hasWhatsappAppSecret;
  const [editingAccessToken, setEditingAccessToken] = useState(!tokenAlreadySaved);
  const [editingAppSecret, setEditingAppSecret] = useState(!secretAlreadySaved);

  // Form state
  const [wabaId, setWabaId] = useState(settings.whatsappBusinessAccountId || '');
  const [phoneNumberId, setPhoneNumberId] = useState(settings.whatsappPhoneNumberId || '');
  const [accessToken, setAccessToken] = useState('');
  const [appId, setAppId] = useState(settings.whatsappAppId || '');
  const [appSecret, setAppSecret] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(settings.whatsappWebhookVerifyToken || '');
  const [apiVersion, setApiVersion] = useState(settings.whatsappApiVersion || 'v18.0');

  // Generate webhook URL (read-only)
  const webhookUrl = `${window.location.origin}/api/v1/webhooks/whatsapp`;

  // Load existing values when settings change. Secrets are never echoed by the
  // backend; we just sync the "is editing" toggles based on whether they exist.
  useEffect(() => {
    if (settings.whatsappBusinessAccountId) setWabaId(settings.whatsappBusinessAccountId);
    if (settings.whatsappPhoneNumberId) setPhoneNumberId(settings.whatsappPhoneNumberId);
    if (settings.whatsappAppId) setAppId(settings.whatsappAppId);
    if (settings.whatsappWebhookVerifyToken) setWebhookVerifyToken(settings.whatsappWebhookVerifyToken);
    if (settings.whatsappApiVersion) setApiVersion(settings.whatsappApiVersion);
    setEditingAccessToken(!settings.hasWhatsappAccessToken);
    setEditingAppSecret(!settings.hasWhatsappAppSecret);
  }, [settings]);

  // Validation functions
  const validateWABAId = (value: string): string | null => {
    if (!value.trim()) return 'WABA ID is required';
    if (!/^\d{15,18}$/.test(value)) {
      return 'WABA ID must be 15-18 numeric digits';
    }
    return null;
  };

  const validatePhoneNumberId = (value: string): string | null => {
    if (!value.trim()) return 'Phone Number ID is required';
    if (!/^\d{15,18}$/.test(value)) {
      return 'Phone Number ID must be 15-18 numeric digits';
    }
    return null;
  };

  const validateAccessToken = (value: string): string | null => {
    // If a token is already saved in DB and the user hasn't entered editing
    // mode, the field is allowed to be blank — the backend will keep the
    // existing value. Only enforce "required" when actively editing.
    if (!value.trim()) {
      return tokenAlreadySaved && !editingAccessToken ? null : 'Access Token is required';
    }
    if (value.length < 50) {
      return 'Access Token appears to be invalid (too short)';
    }
    return null;
  };

  const validateAppId = (value: string): string | null => {
    if (!value.trim()) return null;
    if (!/^\d{15,17}$/.test(value)) {
      return 'App ID must be 15-17 numeric digits';
    }
    return null;
  };

  const validateAppSecret = (value: string): string | null => {
    if (!value.trim()) return null;
    if (value.length < 32) {
      return 'App Secret appears to be invalid (too short)';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors = [
      validateWABAId(wabaId),
      validatePhoneNumberId(phoneNumberId),
      validateAccessToken(accessToken),
      validateAppId(appId),
      validateAppSecret(appSecret),
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error('Validation Error', {
        description: errors[0] || 'Please check all required fields',
      });
      return false;
    }
    return true;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      // Create a test request to verify credentials
      const testData = {
        whatsappBusinessAccountId: wabaId,
        whatsappPhoneNumberId: phoneNumberId,
        whatsappAccessToken: accessToken,
        whatsappAppId: appId,
        whatsappAppSecret: appSecret,
      };

      // Call backend to test connection
      const response = await apiService.settings.testWhatsAppConnection(testData);
      
      if (response.success) {
        const details = response.data || {};
        const summary = details.summary || {};
        
        let message = response.message || 'Connection test successful!';
        if (details.phoneNumberDetails) {
          message += `\nPhone: ${details.phoneNumberDetails.displayPhoneNumber || 'N/A'}`;
          message += `\nQuality: ${details.phoneNumberDetails.qualityRating || 'UNKNOWN'}`;
        }
        if (details.wabaDetails?.name) {
          message += `\nWABA: ${details.wabaDetails.name}`;
        }
        
        setConnectionTestResult({
          success: true,
          message: message,
        });
        toast.success('Connection Test Successful', {
          description: `Phone Number: ${summary.phoneNumberAccessible ? '✅' : '❌'}, WABA: ${summary.wabaAccessible ? '✅' : '⚠️'}, Messages: ${summary.canSendMessages ? '✅' : '⚠️'}`,
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: response.error?.message || 'Connection test failed',
        });
        toast.error('Connection Test Failed', {
          description: response.error?.message || 'Please verify your credentials',
        });
      }
    } catch (error: any) {
      setConnectionTestResult({
        success: false,
        message: error.response?.data?.error?.message || error.message || 'Connection test failed',
      });
      toast.error('Connection Test Failed', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const settingsData: any = {
      whatsappBusinessAccountId: wabaId.trim() || null,
      whatsappPhoneNumberId: phoneNumberId.trim() || null,
      whatsappAppId: appId.trim() || null,
      whatsappApiVersion: apiVersion || 'v18.0',
      whatsappWebhookVerifyToken: webhookVerifyToken.trim() || null,
      wabaLinkedVia: 'manual',
    };

    // Only include sensitive fields if user has entered values
    if (accessToken && accessToken.trim() !== '') {
      settingsData.whatsappAccessToken = accessToken.trim();
    }
    if (appSecret && appSecret.trim() !== '') {
      settingsData.whatsappAppSecret = appSecret.trim();
    }

    await onSave(settingsData);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) {
      toast.error(`${label} is empty`);
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Test Result */}
      {connectionTestResult && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${
          connectionTestResult.success
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          {connectionTestResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              connectionTestResult.success
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {connectionTestResult.message}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          WhatsApp Business API Configuration
        </h3>

        <div className="space-y-6">
          {/* WABA ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              WhatsApp Business Account ID (WABA ID) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={wabaId}
                onChange={(e) => {
                  setWabaId(e.target.value);
                  setConnectionTestResult(null);
                }}
                placeholder="123456789012345"
                className={`flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white ${
                  validateWABAId(wabaId) ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                }`}
              />
              <button
                onClick={() => copyToClipboard(wabaId, 'WABA ID')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                disabled={!wabaId}
                title="Copy WABA ID"
              >
                <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            {validateWABAId(wabaId) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validateWABAId(wabaId)}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your WhatsApp Business Account ID (15-18 numeric digits)
            </p>
          </div>

          {/* Phone Number ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number ID <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => {
                  setPhoneNumberId(e.target.value);
                  setConnectionTestResult(null);
                }}
                placeholder="987654321098765"
                className={`flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white ${
                  validatePhoneNumberId(phoneNumberId) ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                }`}
              />
              <button
                onClick={() => copyToClipboard(phoneNumberId, 'Phone Number ID')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                disabled={!phoneNumberId}
                title="Copy Phone Number ID"
              >
                <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            {validatePhoneNumberId(phoneNumberId) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validatePhoneNumberId(phoneNumberId)}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your WhatsApp Phone Number ID (15-18 numeric digits)
            </p>
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Access Token <span className="text-red-500">*</span>
            </label>
            {tokenAlreadySaved && !editingAccessToken ? (
              // "Saved" affordance — confirms the token persists across refreshes
              // without re-displaying the secret. Click Replace to swap.
              <div className="flex items-center justify-between gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-800 dark:text-emerald-200">
                    Access token saved
                    <span className="text-emerald-700/70 dark:text-emerald-300/70 ml-2 font-mono text-xs">
                      ••••••••••••
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccessToken(true);
                    setAccessToken('');
                    setConnectionTestResult(null);
                  }}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  Replace
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showAccessToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => {
                      setAccessToken(e.target.value);
                      setConnectionTestResult(null);
                    }}
                    placeholder="Enter your WhatsApp Access Token"
                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white pr-10 ${
                      validateAccessToken(accessToken) ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title={showAccessToken ? 'Hide token' : 'Show token'}
                  >
                    {showAccessToken ? (
                      <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
                {tokenAlreadySaved && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccessToken(false);
                      setAccessToken('');
                    }}
                    className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
            {validateAccessToken(accessToken) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validateAccessToken(accessToken)}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your WhatsApp System User Access Token (encrypted at rest, never echoed back).
            </p>
          </div>

          {/* App ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              App ID <span className="text-gray-400">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={appId}
                onChange={(e) => {
                  setAppId(e.target.value);
                  setConnectionTestResult(null);
                }}
                placeholder="123456789012345"
                className={`flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white ${
                  validateAppId(appId) ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                }`}
              />
              <button
                onClick={() => copyToClipboard(appId, 'App ID')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                disabled={!appId}
                title="Copy App ID"
              >
                <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            {validateAppId(appId) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validateAppId(appId)}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your Meta App ID (15-17 numeric digits). Only required for inbound webhook signature verification — leave blank if you only need to send messages.
            </p>
          </div>

          {/* App Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              App Secret <span className="text-gray-400">(optional)</span>
            </label>
            {secretAlreadySaved && !editingAppSecret ? (
              <div className="flex items-center justify-between gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-800 dark:text-emerald-200">
                    App secret saved
                    <span className="text-emerald-700/70 dark:text-emerald-300/70 ml-2 font-mono text-xs">
                      ••••••••••••
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAppSecret(true);
                    setAppSecret('');
                    setConnectionTestResult(null);
                  }}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  Replace
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showAppSecret ? 'text' : 'password'}
                    value={appSecret}
                    onChange={(e) => {
                      setAppSecret(e.target.value);
                      setConnectionTestResult(null);
                    }}
                    placeholder="Enter your App Secret"
                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white pr-10 ${
                      validateAppSecret(appSecret) ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAppSecret(!showAppSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title={showAppSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showAppSecret ? (
                      <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
                {secretAlreadySaved && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAppSecret(false);
                      setAppSecret('');
                    }}
                    className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
            {validateAppSecret(appSecret) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validateAppSecret(appSecret)}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your Meta App Secret (will be encrypted when saved). Only required for inbound webhook signature verification — leave blank if you only need to send messages.
            </p>
          </div>

          {/* API Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Version
            </label>
            <select
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="v18.0">v18.0</option>
              <option value="v17.0">v17.0</option>
              <option value="v16.0">v16.0</option>
              <option value="v15.0">v15.0</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              WhatsApp Business API version to use
            </p>
          </div>

          {/* Webhook Verify Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Webhook Verify Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookVerifyToken}
                onChange={(e) => setWebhookVerifyToken(e.target.value)}
                placeholder="Enter webhook verify token"
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  // Generate a 32-char hex token, prefixed with `wht_`. Uses
                  // crypto.randomUUID where available, falls back to
                  // crypto.getRandomValues, then to Math.random.
                  const c: any = (typeof crypto !== 'undefined' ? crypto : null);
                  let raw = '';
                  if (c?.randomUUID) {
                    raw = c.randomUUID().replace(/-/g, '');
                  } else if (c?.getRandomValues) {
                    const bytes = new Uint8Array(16);
                    c.getRandomValues(bytes);
                    raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
                  } else {
                    raw = Array.from({ length: 32 }, () =>
                      Math.floor(Math.random() * 16).toString(16)
                    ).join('');
                  }
                  const token = `wht_${raw}`;
                  setWebhookVerifyToken(token);
                  navigator.clipboard.writeText(token).catch(() => {});
                  toast.success('Verify token generated and copied', {
                    description: 'Save credentials, then paste the same token into Meta App Dashboard.',
                  });
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                title="Generate a secure random verify token"
              >
                <Sparkles className="w-4 h-4" />
                Generate
              </button>
              <button
                type="button"
                onClick={() => {
                  if (webhookVerifyToken) {
                    navigator.clipboard.writeText(webhookVerifyToken);
                    toast.success('Verify token copied to clipboard');
                  }
                }}
                disabled={!webhookVerifyToken}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                title="Copy verify token"
              >
                <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Click Generate for a secure random token. After saving, paste the
              same value into Meta App Dashboard → WhatsApp → Configuration →
              Verify Token.
            </p>
          </div>

          {/* Webhook URL (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Webhook URL <span className="text-gray-400 text-xs">(Read-only)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Copy Webhook URL"
              >
                <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <a
                href={webhookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Open Webhook URL"
              >
                <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </a>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Configure this URL in your Meta App settings for webhook notifications
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleTestConnection}
          disabled={testingConnection || saving}
          className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testingConnection ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Test Connection
            </>
          )}
        </button>

        <button
          onClick={handleSave}
          disabled={saving || testingConnection}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
