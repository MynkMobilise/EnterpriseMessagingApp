import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, Globe, Clock } from 'lucide-react';
import { useOrganization } from '../../../../contexts/OrganizationContext';

interface BusinessInfoFormProps {
  onBusinessInfoChange: (info: {
    displayName?: string;
    category?: string;
    description?: string;
  }) => void;
  initialValues?: {
    displayName?: string;
    category?: string;
    description?: string;
  };
}

const BUSINESS_CATEGORIES = [
  'Automotive',
  'Beauty, Spa and Salon',
  'Clothing and Apparel',
  'Education',
  'Entertainment',
  'Event Planning and Service',
  'Finance',
  'Food and Beverage',
  'Healthcare',
  'Hospitality',
  'Insurance',
  'Legal',
  'Non-profit',
  'Real Estate',
  'Retail',
  'Technology',
  'Travel and Tourism',
  'Other',
];

export function BusinessInfoForm({
  onBusinessInfoChange,
  initialValues,
}: BusinessInfoFormProps) {
  const { currentOrganization } = useOrganization();
  const [displayName, setDisplayName] = useState(initialValues?.displayName || currentOrganization?.name || '');
  const [category, setCategory] = useState(initialValues?.category || '');
  const [description, setDescription] = useState(initialValues?.description || '');

  useEffect(() => {
    onBusinessInfoChange({
      displayName: displayName || undefined,
      category: category || undefined,
      description: description || undefined,
    });
  }, [displayName, category, description, onBusinessInfoChange]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Pre-fill your business information to speed up the WhatsApp Business Account setup process. 
          All fields are optional - you can also enter this information directly in Facebook's dialog.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          Display Name for WhatsApp
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={currentOrganization?.name || 'Enter your business display name'}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This name will be displayed to customers when you send WhatsApp messages
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
        >
          <option value="">Select a category (optional)</option>
          {BUSINESS_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of your business (optional)"
          rows={3}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Optional: Brief description of what your business does
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
        <p className="font-medium mb-1">Note:</p>
        <p>
          Your organization's name, email, and phone number from your account settings will be automatically 
          pre-filled in Facebook's dialog. You can modify them there if needed.
        </p>
      </div>
    </div>
  );
}

