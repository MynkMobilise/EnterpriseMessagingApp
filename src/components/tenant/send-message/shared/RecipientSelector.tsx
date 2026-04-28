import { useState, useEffect } from 'react';
import { Search, Check, Plus, Trash2, Upload, Download, Users } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../../utils/api';
import { useOrganization } from '../../../../contexts/OrganizationContext';
import type { Channel, Recipient, SendMode } from '../types';

interface RecipientSelectorProps {
  channel: Channel;
  sendMode: SendMode;
  recipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
  selectedContactId?: string;
  onContactSelect?: (contactId: string) => void;
  // Single send mode values
  phoneNumber?: string;
  onPhoneNumberChange?: (phone: string) => void;
  emailAddress?: string;
  onEmailAddressChange?: (email: string) => void;
  fcmToken?: string;
  onFcmTokenChange?: (token: string) => void;
}

export function RecipientSelector({
  channel,
  sendMode,
  recipients,
  onRecipientsChange,
  selectedContactId,
  onContactSelect,
  phoneNumber: externalPhoneNumber,
  onPhoneNumberChange,
  emailAddress: externalEmailAddress,
  onEmailAddressChange,
  fcmToken: externalFcmToken,
  onFcmTokenChange,
}: RecipientSelectorProps) {
  const [contactInputMode, setContactInputMode] = useState<'manual' | 'select'>('manual');
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'manual' | 'csv' | 'groups'>('manual');
  const [contactGroups, setContactGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Use external values if provided, otherwise use internal state
  const [internalPhoneNumber, setInternalPhoneNumber] = useState('');
  const [internalEmailAddress, setInternalEmailAddress] = useState('');
  const [internalFcmToken, setInternalFcmToken] = useState('');

  const phoneNumber = externalPhoneNumber !== undefined ? externalPhoneNumber : internalPhoneNumber;
  const emailAddress = externalEmailAddress !== undefined ? externalEmailAddress : internalEmailAddress;
  const fcmToken = externalFcmToken !== undefined ? externalFcmToken : internalFcmToken;

  const handlePhoneNumberChange = (value: string) => {
    if (onPhoneNumberChange) {
      onPhoneNumberChange(value);
    } else {
      setInternalPhoneNumber(value);
    }
  };

  const handleEmailAddressChange = (value: string) => {
    if (onEmailAddressChange) {
      onEmailAddressChange(value);
    } else {
      setInternalEmailAddress(value);
    }
  };

  const handleFcmTokenChange = (value: string) => {
    if (onFcmTokenChange) {
      onFcmTokenChange(value);
    } else {
      setInternalFcmToken(value);
    }
  };

  const { currentOrganization } = useOrganization();

  // Fetch contacts
  useEffect(() => {
    if (!currentOrganization) return;

    const fetchContacts = async () => {
      try {
        const response = await apiService.contacts.list({ limit: 100, search: contactSearchQuery });
        if (response.success && response.data) {
          const contactsData = Array.isArray(response.data) ? response.data : (response.data.contacts || []);
          setContacts(contactsData);
        }
      } catch (error: any) {
        console.error('Failed to fetch contacts:', error);
      }
    };

    if (contactInputMode === 'select' && contactSearchQuery.length >= 0) {
      fetchContacts();
    }
  }, [contactInputMode, contactSearchQuery, currentOrganization?.id]);

  // Fetch contact groups
  useEffect(() => {
    const fetchContactGroups = async () => {
      try {
        const response = await apiService.contactGroups.list({ limit: 100 });
        if (response.success && response.data) {
          setContactGroups(response.data);
        }
      } catch (error: any) {
        console.error('Failed to fetch contact groups:', error);
      }
    };

    if (sendMode === 'bulk' && uploadMethod === 'groups') {
      fetchContactGroups();
    }
  }, [sendMode, uploadMethod]);

  // Load contacts from selected group
  useEffect(() => {
    const loadGroupContacts = async () => {
      if (!selectedGroupId) {
        onRecipientsChange([]);
        return;
      }

      try {
        const response = await apiService.contactGroups.getContacts(selectedGroupId, { limit: 1000 });
        if (response.success && response.data) {
          const contactsData = Array.isArray(response.data) ? response.data : (response.data.contacts || []);
          const mappedRecipients = contactsData.map((contact: any) => {
            const recipient: Recipient = { name: contact.name || '' };
            if (channel === 'whatsapp' || channel === 'sms') {
              recipient.phone = contact.phoneNumber || contact.phone;
            } else if (channel === 'email') {
              recipient.email = contact.email;
            } else if (channel === 'fcm') {
              recipient.fcmToken = contact.metadata?.fcmToken || contact.fcmToken;
            }
            return recipient;
          });
          onRecipientsChange(mappedRecipients);
        }
      } catch (error: any) {
        console.error('Failed to load group contacts:', error);
        toast.error('Failed to load contacts from group');
      }
    };

    if (uploadMethod === 'groups' && selectedGroupId) {
      loadGroupContacts();
    }
  }, [selectedGroupId, uploadMethod, channel, onRecipientsChange]);

  // Update recipient when contact is selected (single mode)
  useEffect(() => {
    if (selectedContactId && contactInputMode === 'select' && sendMode === 'single') {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (contact) {
        if (channel === 'whatsapp' || channel === 'sms') {
          handlePhoneNumberChange(contact.phoneNumber || contact.phone || '');
        } else if (channel === 'email') {
          handleEmailAddressChange(contact.email || '');
        } else if (channel === 'fcm') {
          handleFcmTokenChange(contact.metadata?.fcmToken || contact.fcmToken || '');
        }
      }
    }
  }, [selectedContactId, contacts, contactInputMode, channel, sendMode]);

  const addRecipient = () => {
    onRecipientsChange([...recipients, {}]);
  };

  const removeRecipient = (index: number) => {
    onRecipientsChange(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: keyof Recipient, value: string) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    onRecipientsChange(updated);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1);
      const csvRecipients = lines
        .filter((line) => line.trim())
        .map((line) => {
          const [phone, name] = line.split(',').map((s) => s.trim());
          const recipient: Recipient = { name };
          if (channel === 'whatsapp' || channel === 'sms') {
            recipient.phone = phone;
          } else if (channel === 'email') {
            recipient.email = phone; // CSV might have email in first column
          }
          return recipient;
        });
      onRecipientsChange(csvRecipients);
      toast.success(`Imported ${csvRecipients.length} recipients from CSV`);
    };
    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const headers = channel === 'email' ? 'email,name\n' : channel === 'fcm' ? 'fcmToken,name\n' : 'phone,name\n';
    const csv = headers + (channel === 'email' 
      ? 'user@example.com,John Doe\nuser2@example.com,Jane Smith'
      : channel === 'fcm'
      ? 'fcm_token_1,John Doe\nfcm_token_2,Jane Smith'
      : '+1234567890,John Doe\n+9876543210,Jane Smith');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_recipients_${channel}_template.csv`;
    a.click();
    toast.success('CSV template downloaded');
  };

  // Single send mode
  if (sendMode === 'single') {
    return (
      <div className="space-y-4">
        {/* Contact Input Mode Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setContactInputMode('manual');
              if (onContactSelect) onContactSelect('');
              setShowContactDropdown(false);
              // Clear values when switching to manual
              if (channel === 'whatsapp' || channel === 'sms') {
                handlePhoneNumberChange('');
              } else if (channel === 'email') {
                handleEmailAddressChange('');
              } else if (channel === 'fcm') {
                handleFcmTokenChange('');
              }
            }}
            className={`px-4 py-2 text-sm rounded-lg transition-all ${
              contactInputMode === 'manual'
                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Enter {channel === 'whatsapp' || channel === 'sms' ? 'Number' : channel === 'email' ? 'Email' : 'Token'}
          </button>
          <button
            onClick={() => {
              setContactInputMode('select');
              handlePhoneNumberChange('');
              handleEmailAddressChange('');
              handleFcmTokenChange('');
            }}
            className={`px-4 py-2 text-sm rounded-lg transition-all ${
              contactInputMode === 'select'
                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Select Contact
          </button>
        </div>

        {contactInputMode === 'manual' ? (
          <div className="space-y-4">
            {(channel === 'whatsapp' || channel === 'sms') && (
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
              </div>
            )}
            {channel === 'email' && (
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => handleEmailAddressChange(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
            )}
            {channel === 'fcm' && (
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  FCM Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fcmToken}
                  onChange={(e) => handleFcmTokenChange(e.target.value)}
                  placeholder="Enter FCM registration token"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Firebase Cloud Messaging registration token</p>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Select Contact <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={contactSearchQuery}
                onChange={(e) => {
                  setContactSearchQuery(e.target.value);
                  setShowContactDropdown(true);
                }}
                onFocus={() => setShowContactDropdown(true)}
                placeholder="Search contacts..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              {showContactDropdown && contacts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        if (onContactSelect) onContactSelect(contact.id);
                        const contactValue = channel === 'whatsapp' || channel === 'sms'
                          ? (contact.phoneNumber || contact.phone)
                          : channel === 'email'
                          ? contact.email
                          : (contact.metadata?.fcmToken || contact.fcmToken);
                        if (channel === 'whatsapp' || channel === 'sms') {
                          handlePhoneNumberChange(contactValue || '');
                        } else if (channel === 'email') {
                          handleEmailAddressChange(contactValue || '');
                        } else if (channel === 'fcm') {
                          handleFcmTokenChange(contactValue || '');
                        }
                        setContactSearchQuery(contact.name || contactValue || '');
                        setShowContactDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{contact.name || 'No name'}</p>
                        <p className="text-xs text-gray-500">
                          {channel === 'whatsapp' || channel === 'sms'
                            ? (contact.phoneNumber || contact.phone)
                            : channel === 'email'
                            ? contact.email
                            : (contact.metadata?.fcmToken || contact.fcmToken || 'N/A')}
                        </p>
                      </div>
                      {selectedContactId === contact.id && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Bulk send mode
  return (
    <div className="space-y-4">
      {/* Upload Method Selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setUploadMethod('manual')}
          className={`px-4 py-2 text-sm rounded-lg transition-all ${
            uploadMethod === 'manual'
              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setUploadMethod('csv')}
          className={`px-4 py-2 text-sm rounded-lg transition-all ${
            uploadMethod === 'csv'
              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          Upload CSV
        </button>
        <button
          onClick={() => setUploadMethod('groups')}
          className={`px-4 py-2 text-sm rounded-lg transition-all ${
            uploadMethod === 'groups'
              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1" />
          Contact Groups
        </button>
      </div>

      {/* Contact Group Selection */}
      {uploadMethod === 'groups' && (
        <div className="mb-4">
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Select Contact Group <span className="text-red-500">*</span>
          </label>
          {contactGroups.length > 0 ? (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value="">-- Select a group --</option>
              {contactGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.contactCount || 0} contacts)
                </option>
              ))}
            </select>
          ) : (
            <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No contact groups available. Create a group in the Contacts page.
              </p>
            </div>
          )}
          {selectedGroupId && recipients.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">Loaded {recipients.length} contacts from selected group</p>
          )}
        </div>
      )}

      {/* Manual Entry */}
      {uploadMethod === 'manual' && (
        <div className="space-y-3">
          {recipients.map((recipient, index) => (
            <div key={index} className="flex gap-2">
              <input
                type={channel === 'email' ? 'email' : 'text'}
                value={channel === 'whatsapp' || channel === 'sms' 
                  ? (recipient.phone || '')
                  : channel === 'email'
                  ? (recipient.email || '')
                  : (recipient.fcmToken || '')}
                onChange={(e) => {
                  const field = channel === 'whatsapp' || channel === 'sms' ? 'phone' 
                    : channel === 'email' ? 'email' 
                    : 'fcmToken';
                  updateRecipient(index, field, e.target.value);
                }}
                placeholder={
                  channel === 'whatsapp' || channel === 'sms' 
                    ? '+1 (555) 123-4567'
                    : channel === 'email'
                    ? 'user@example.com'
                    : 'FCM token'
                }
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                value={recipient.name || ''}
                onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                placeholder="Name (optional)"
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <button
                onClick={() => removeRecipient(index)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            onClick={addRecipient}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Recipient
          </button>
        </div>
      )}

      {/* CSV Upload */}
      {uploadMethod === 'csv' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-700">Upload CSV file</span>
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
            <p className="text-sm text-gray-500 mt-2">
              CSV should have columns: {channel === 'email' ? 'email, name' : channel === 'fcm' ? 'fcmToken, name' : 'phone, name'}
            </p>
          </div>
          <button
            onClick={downloadCSVTemplate}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download CSV Template
          </button>
          {recipients.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">✓ {recipients.length} recipients loaded</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

