import { useState, useEffect } from 'react';
import { Save, Building, Globe, Database, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../utils/api';
import { useOrganization } from '../../../contexts/OrganizationContext';

interface CompanyProfileSettingsProps {
  organizationId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export function CompanyProfileSettings({ organizationId, onClose, isModal = false }: CompanyProfileSettingsProps = {}) {
  const { currentOrganization } = useOrganization();
  const targetOrganizationId = organizationId || currentOrganization?.id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Company Information
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');

  // Regional Settings
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [currency, setCurrency] = useState('USD');

  // Data Retention
  const [messageLogRetention, setMessageLogRetention] = useState('90 days');
  const [mediaFileRetention, setMediaFileRetention] = useState('90 days');

  useEffect(() => {
    if (targetOrganizationId) {
      // Load organization data
      loadOrganizationData();
    }
  }, [targetOrganizationId]);

  const loadOrganizationData = async () => {
    if (!targetOrganizationId) return;
    
    try {
      setLoading(true);
      const response = await apiService.organizations.getById(targetOrganizationId);
      if (response.success && response.data) {
        const org = response.data;
        // Set company name and industry from loaded data
        setCompanyName(org.name || '');
        setIndustry(org.industry || '');
        // Map organization data to form fields
        setContactEmail(org.email || '');
        setContactPhone(org.phone || '');
        setWebsite(org.website || '');
        setAddress(org.address || '');
        
        // Get settings from organization.settings JSON field
        const orgSettings = org.settings || {};
        setDescription(orgSettings.description || '');
        setTimezone(orgSettings.timezone || 'UTC');
        setLanguage(orgSettings.language || 'en');
        setDateFormat(orgSettings.dateFormat || 'MM/DD/YYYY');
        setCurrency(orgSettings.currency || 'USD');
        setMessageLogRetention(orgSettings.messageLogRetention || '90 days');
        setMediaFileRetention(orgSettings.mediaFileRetention || '90 days');
      }
    } catch (error: any) {
      console.error('Failed to load organization data:', error);
      toast.error('Failed to load organization data', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!targetOrganizationId) return;

    try {
      setSaving(true);
      const updateData = {
        // Company Information - direct fields
        name: companyName,
        industry,
        email: contactEmail,
        phone: contactPhone,
        website,
        address,
        // Description and regional settings go in settings JSON
        description,
        settings: {
          timezone,
          language,
          dateFormat,
          currency,
          messageLogRetention,
          mediaFileRetention,
        },
      };

      const response = await apiService.organizations.update(targetOrganizationId, updateData);
      if (response.success) {
        toast.success('Profile settings saved successfully');
        // Reload organization data to reflect changes
        await loadOrganizationData();
        // If in modal, refresh organization list in parent
        if (isModal && onClose) {
          // Trigger a refresh by closing and reopening or just reload
          window.location.reload(); // Simple approach - could be improved with context refresh
        }
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isModal && onClose && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Company Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}
      {/* Company Information */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg text-gray-900 dark:text-white">Company Information</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                <option value="">Select industry</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@company.com"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.yourcompany.com"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Company Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your company..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Business Street, City, State ZIP"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Time Zone & Locale */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg text-gray-900 dark:text-white">Regional Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Time Zone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="UTC">UTC</option>
              <option value="America/Los_Angeles">Pacific Time (PT) - UTC-8</option>
              <option value="America/New_York">Eastern Time (ET) - UTC-5</option>
              <option value="Europe/Paris">Central European Time (CET) - UTC+1</option>
              <option value="Asia/Kolkata">India Standard Time (IST) - UTC+5:30</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="en">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Retention */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg text-gray-900 dark:text-white">Data Retention</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Message Log Retention Period
            </label>
            <select
              value={messageLogRetention}
              onChange={(e) => setMessageLogRetention(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="30 days">30 days</option>
              <option value="60 days">60 days</option>
              <option value="90 days">90 days</option>
              <option value="180 days">180 days</option>
              <option value="1 year">1 year</option>
              <option value="Forever">Forever</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How long to keep message logs and delivery reports
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Media File Retention
            </label>
            <select
              value={mediaFileRetention}
              onChange={(e) => setMediaFileRetention(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="30 days">30 days</option>
              <option value="90 days">90 days</option>
              <option value="180 days">180 days</option>
              <option value="1 year">1 year</option>
              <option value="Forever">Forever</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How long to store uploaded media files
            </p>
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
          {saving ? 'Saving...' : 'Save Profile Settings'}
        </button>
      </div>
    </div>
  );
}

