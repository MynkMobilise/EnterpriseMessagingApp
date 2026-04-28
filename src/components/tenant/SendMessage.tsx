import React, { useState, useEffect } from 'react';
import { Send, Eye, Upload, X, MessageSquare, Users, Plus, Trash2, Download, Calendar, Clock, DollarSign, FileText, Phone, Search, Check, Mail, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import { useOrganization } from '../../contexts/OrganizationContext';

export function SendMessage() {
  const [sendMode, setSendMode] = useState<'single' | 'bulk'>('single');
  const [messageType, setMessageType] = useState<'text' | 'template' | 'media'>('template');
  
  // Channel selection
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email' | 'fcm'>('whatsapp');
  const [selectedSmsProvider, setSelectedSmsProvider] = useState<string>('');
  const [availableSmsProviders, setAvailableSmsProviders] = useState<any[]>([]);
  
  // Single send state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [fcmToken, setFcmToken] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactInputMode, setContactInputMode] = useState<'manual' | 'select'>('manual');
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  
  // Bulk send state
  const [bulkRecipients, setBulkRecipients] = useState<{ phone?: string; email?: string; fcmToken?: string; name?: string }[]>([]);
  const [uploadMethod, setUploadMethod] = useState<'manual' | 'csv' | 'contacts' | 'groups'>('manual');
  const [contactGroups, setContactGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  // Message state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [placeholders, setPlaceholders] = useState<{ [key: string]: string }>({});
  const [textMessage, setTextMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  
  // Advanced options
  const [scheduleMessage, setScheduleMessage] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  // Preview & status
  const [showJSONPreview, setShowJSONPreview] = useState(false);
  const [showBulkProgress, setShowBulkProgress] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0, failed: 0 });

  const [templates, setTemplates] = useState<any[]>([]);

  const { currentOrganization } = useOrganization();

  // Fetch approved templates from API filtered by channel
  useEffect(() => {
    if (!currentOrganization) return;

    const fetchTemplates = async () => {
      try {
        const response = await apiService.templates.list({ status: 'approved', limit: 100 });
        if (response.success && response.data) {
          const templatesData = response.data.templates || response.data;
          // Filter templates by selected channel and map them
          const filteredTemplates = templatesData
            .filter((template: any) => template.channel === channel)
            .map((template: any) => ({
              id: template.id,
              name: template.name,
              channel: template.channel,
              content: template.body || template.htmlBody || template.plainTextBody || '',
              variables: template.variables || [],
              category: template.category,
              status: template.status,
              subject: template.subject, // For email/FCM
              htmlBody: template.htmlBody, // For email
              plainTextBody: template.plainTextBody, // For email
            }));
          setTemplates(filteredTemplates);
          // Clear selected template if it doesn't match the channel
          if (selectedTemplate) {
            const selectedTemplateData = filteredTemplates.find((t: any) => t.id === selectedTemplate);
            if (!selectedTemplateData) {
              setSelectedTemplate('');
              setPlaceholders({});
            }
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch templates:', error);
      }
    };

    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]); // Re-fetch when channel changes

  // Fetch available SMS providers
  useEffect(() => {
    const fetchSmsProviders = async () => {
      try {
        const response = await apiService.settings.getAvailableSmsProviders();
        if (response.success && response.data) {
          setAvailableSmsProviders(response.data);
          if (response.data.length > 0 && !selectedSmsProvider) {
            setSelectedSmsProvider(response.data[0].id);
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch SMS providers:', error);
      }
    };

    if (channel === 'sms') {
      fetchSmsProviders();
    }
  }, [channel]);

  // Fetch contacts for selection
  useEffect(() => {
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
  }, [contactInputMode, contactSearchQuery]);

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
        setBulkRecipients([]);
        return;
      }

      try {
        const response = await apiService.contactGroups.getContacts(selectedGroupId, { limit: 1000 });
        if (response.success && response.data) {
          const contactsData = Array.isArray(response.data) ? response.data : (response.data.contacts || []);
          setBulkRecipients(contactsData.map((contact: any) => ({
            phone: contact.phoneNumber || contact.phone,
            name: contact.name || '',
          })));
        }
      } catch (error: any) {
        console.error('Failed to load group contacts:', error);
        toast.error('Failed to load contacts from group');
      }
    };

    if (uploadMethod === 'groups' && selectedGroupId) {
      loadGroupContacts();
    }
  }, [selectedGroupId, uploadMethod]);

  // Update phone number when contact is selected
  useEffect(() => {
    if (selectedContactId && contactInputMode === 'select') {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (contact) {
        setPhoneNumber(contact.phoneNumber || contact.phone || '');
      }
    }
  }, [selectedContactId, contacts, contactInputMode]);

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

  const addRecipient = () => {
    setBulkRecipients([...bulkRecipients, { phone: '', name: '' }]);
  };

  const removeRecipient = (index: number) => {
    setBulkRecipients(bulkRecipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: 'phone' | 'name', value: string) => {
    const updated = [...bulkRecipients];
    updated[index][field] = value;
    setBulkRecipients(updated);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1); // Skip header
      const recipients = lines
        .filter((line) => line.trim())
        .map((line) => {
          const [phone, name] = line.split(',').map((s) => s.trim());
          return { phone, name };
        });
      setBulkRecipients(recipients);
      toast.success(`Imported ${recipients.length} recipients from CSV`);
    };
    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const csv = 'phone,name\n+1234567890,John Doe\n+9876543210,Jane Smith';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_recipients_template.csv';
    a.click();
    toast.success('CSV template downloaded');
  };

  const generateWhatsAppPayload = () => {
    if (messageType === 'template' && selectedTemplateData) {
      const components = [];
      
      if (selectedTemplateData.variables.length > 0) {
        components.push({
          type: 'body',
          parameters: selectedTemplateData.variables.map((variable) => ({
            type: 'text',
            text: placeholders[variable] || `{{${variable}}}`,
          })),
        });
      }

      return {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: selectedTemplateData.name.toLowerCase().replace(/\s+/g, '_'),
          language: {
            code: 'en',
          },
          components,
        },
      };
    } else if (messageType === 'text') {
      return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: {
          preview_url: true,
          body: textMessage,
        },
      };
    } else if (messageType === 'media' && attachment) {
      return {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'image', // or 'video', 'document'
        image: {
          link: 'https://example.com/media/uploaded-file.jpg',
          caption: textMessage,
        },
      };
    }
    return null;
  };

  const calculateEstimatedCost = () => {
    const recipientCount = sendMode === 'single' ? 1 : bulkRecipients.length;
    const costPerMessage = 0.005; // Example: $0.005 per message
    const categoryMultiplier = selectedTemplateData?.category === 'Marketing' ? 1.5 : 1.0;
    return (recipientCount * costPerMessage * categoryMultiplier).toFixed(3);
  };

  const handleSendMessage = async () => {
    if (sendMode === 'single') {
      if (!phoneNumber) {
        toast.error('Please enter a phone number');
        return;
      }
    } else {
      if (bulkRecipients.length === 0) {
        toast.error('Please add at least one recipient');
        return;
      }
    }

    if (messageType === 'template' && !selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    if (messageType === 'text' && !textMessage) {
      toast.error('Please enter a message');
      return;
    }

    try {
      if (sendMode === 'bulk') {
        // Bulk send
        setShowBulkProgress(true);
        setBulkProgress({ sent: 0, total: bulkRecipients.length, failed: 0 });

        const recipients = bulkRecipients.map(r => {
          const recipient: any = {
            name: r.name,
            variables: placeholders,
          };
          if (channel === 'whatsapp' || channel === 'sms') {
            recipient.phone = r.phone;
          } else if (channel === 'email') {
            recipient.email = r.email;
          } else if (channel === 'fcm') {
            recipient.fcmToken = r.fcmToken;
          }
          return recipient;
        });

        const response = await apiService.messages.sendBulk({
          name: `Bulk send ${new Date().toISOString()}`,
          channel: channel,
          smsProvider: channel === 'sms' ? selectedSmsProvider : undefined,
          subject: emailSubject || undefined,
          templateId: selectedTemplate,
          recipients,
          priority: 'normal',
        });

        if (response.success) {
          setBulkProgress({ sent: recipients.length, total: recipients.length, failed: 0 });
          setTimeout(() => {
            setShowBulkProgress(false);
            toast.success(`Bulk send initiated! ${recipients.length} messages queued`);
          }, 1000);
        }
      } else {
        // Single send
        toast.loading('Sending message...', { id: 'send-message' });
        
        const messageData: any = {
          channel: channel,
          smsProvider: channel === 'sms' ? selectedSmsProvider : undefined,
          messageType: messageType === 'template' ? 'template' : (channel === 'email' || channel === 'fcm' ? 'html' : 'text'),
          priority: 'normal',
        };

        // Add channel-specific recipient field
        if (channel === 'whatsapp' || channel === 'sms') {
          messageData.recipientPhone = phoneNumber;
        } else if (channel === 'email') {
          messageData.recipientEmail = emailAddress;
          messageData.subject = emailSubject || 'Notification';
        } else if (channel === 'fcm') {
          messageData.recipientFcmToken = fcmToken;
          messageData.subject = emailSubject || 'Notification';
        }

        if (messageType === 'template') {
          messageData.templateId = selectedTemplate;
          messageData.variables = placeholders;
        } else {
          messageData.content = textMessage;
        }

        const response = await apiService.messages.send(messageData);
        
        if (response.success) {
          toast.success('Message sent successfully!', { id: 'send-message' });
          // Reset form
          setPhoneNumber('');
          setTextMessage('');
          setSelectedTemplate('');
          setPlaceholders({});
        } else {
          toast.error('Failed to send message', { id: 'send-message' });
        }
      }
    } catch (error: any) {
      toast.error('Failed to send message', {
        description: error.response?.data?.error?.message || error.message,
        id: sendMode === 'bulk' ? undefined : 'send-message',
      });
      if (sendMode === 'bulk') {
        setShowBulkProgress(false);
      }
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl text-gray-900 dark:text-white mb-2">Send Message</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Send messages via WhatsApp or SMS to single or multiple recipients
        </p>
      </div>

      {/* Channel Selection */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Channel
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setChannel('whatsapp')}
            className={`px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              channel === 'whatsapp'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            WhatsApp
          </button>
          <button
            onClick={() => setChannel('sms')}
            className={`px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              channel === 'sms'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Phone className="w-5 h-5" />
            SMS
          </button>
          <button
            onClick={() => setChannel('email')}
            className={`px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              channel === 'email'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Mail className="w-5 h-5" />
            Email
          </button>
          <button
            onClick={() => setChannel('fcm')}
            className={`px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              channel === 'fcm'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Bell className="w-5 h-5" />
            FCM
          </button>
        </div>

        {/* SMS Provider Selection */}
        {channel === 'sms' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              SMS Provider <span className="text-red-500">*</span>
            </label>
            {availableSmsProviders.length > 0 ? (
              <select
                value={selectedSmsProvider}
                onChange={(e) => setSelectedSmsProvider(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                {availableSmsProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  No SMS providers configured. Please configure an SMS provider in Settings.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send Mode Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-2 mb-6 inline-flex gap-2">
        <button
          onClick={() => setSendMode('single')}
          className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 ${
            sendMode === 'single'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Single Send
        </button>
        <button
          onClick={() => setSendMode('bulk')}
          className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 ${
            sendMode === 'bulk'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Bulk Send
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipients Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg text-gray-900 dark:text-white mb-4">
              {sendMode === 'single' ? 'Recipient' : 'Recipients'}
            </h3>

            {sendMode === 'single' ? (
              <div className="space-y-4">
                {/* Contact Input Mode Selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setContactInputMode('manual');
                      setSelectedContactId('');
                      setShowContactDropdown(false);
                    }}
                    className={`px-4 py-2 text-sm rounded-lg transition-all ${
                      contactInputMode === 'manual'
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Enter Number
                  </button>
                  <button
                    onClick={() => {
                      setContactInputMode('select');
                      setPhoneNumber('');
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
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Include country code (e.g., +1 for US)
                        </p>
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
                          onChange={(e) => setEmailAddress(e.target.value)}
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
                          onChange={(e) => setFcmToken(e.target.value)}
                          placeholder="Enter FCM registration token"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Firebase Cloud Messaging registration token
                        </p>
                      </div>
                    )}
                    {(channel === 'email' || channel === 'fcm') && (
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {channel === 'email' ? 'Subject' : 'Title'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder={channel === 'email' ? 'Email subject' : 'Notification title'}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        />
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
                                setSelectedContactId(contact.id);
                                setPhoneNumber(contact.phoneNumber || contact.phone || '');
                                setContactSearchQuery(contact.name || contact.phoneNumber || '');
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
                                    ? (contact.email)
                                    : (contact.metadata?.fcmToken || contact.fcmToken || 'N/A')
                                  }
                                </p>
                              </div>
                              {selectedContactId === contact.id && (
                                <Check className="w-4 h-4 text-blue-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedContactId && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {contacts.find((c) => c.id === selectedContactId)?.name || phoneNumber}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
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
                    {selectedGroupId && bulkRecipients.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Loaded {bulkRecipients.length} contacts from selected group
                      </p>
                    )}
                  </div>
                )}

                {uploadMethod === 'manual' && (
                  <div className="space-y-3">
                    {bulkRecipients.map((recipient, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="tel"
                          value={recipient.phone}
                          onChange={(e) => updateRecipient(index, 'phone', e.target.value)}
                          placeholder="+1 (555) 123-4567"
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

                {uploadMethod === 'csv' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700">Upload CSV file</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        CSV should have columns: phone, name
                      </p>
                    </div>
                    <button
                      onClick={downloadCSVTemplate}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download CSV Template
                    </button>
                    {bulkRecipients.length > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          ✓ {bulkRecipients.length} recipients loaded
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message Type */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg text-gray-900 dark:text-white mb-4">Message Type</h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => setMessageType('template')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  messageType === 'template'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-900 dark:text-white">Template</p>
              </button>
              <button
                onClick={() => setMessageType('text')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  messageType === 'text'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-gray-900 dark:text-white">Text</p>
              </button>
              <button
                onClick={() => setMessageType('media')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  messageType === 'media'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm text-gray-900 dark:text-white">Media</p>
              </button>
            </div>

            {/* Template Selection */}
            {messageType === 'template' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Select Template <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="">Choose a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.category})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplateData && (
                  <>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Template Preview:</p>
                      <p className="text-gray-900 dark:text-white">{selectedTemplateData.content}</p>
                    </div>

                    {selectedTemplateData.variables.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Fill in template variables:
                        </p>
                        {selectedTemplateData.variables.map((variable) => (
                          <div key={variable}>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1 capitalize">
                              {variable.replace(/_/g, ' ')}
                            </label>
                            <input
                              type="text"
                              value={placeholders[variable] || ''}
                              onChange={(e) =>
                                setPlaceholders({ ...placeholders, [variable]: e.target.value })
                              }
                              placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Text Message */}
            {messageType === 'text' && (
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  rows={5}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{textMessage.length} characters</p>
              </div>
            )}

            {/* Media Upload */}
            {messageType === 'media' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Upload Media
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <label className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700">Choose file</span>
                      <input
                        type="file"
                        accept="image/*,video/*,application/pdf"
                        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported: Images, Videos, PDFs (max 16MB)
                    </p>
                    {attachment && (
                      <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                        ✓ {attachment.name}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Caption (Optional)
                  </label>
                  <textarea
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    rows={3}
                    placeholder="Add a caption..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg text-gray-900 dark:text-white mb-4">Advanced Options</h3>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={scheduleMessage}
                  onChange={(e) => setScheduleMessage(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Schedule for later</span>
                </div>
              </label>

              {scheduleMessage && (
                <div className="grid grid-cols-2 gap-4 ml-7">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* API Payload Preview */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <button
              onClick={() => setShowJSONPreview(!showJSONPreview)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-lg text-gray-900 dark:text-white">WhatsApp API Payload</h3>
              <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            {showJSONPreview && (
              <pre className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-x-auto text-xs text-gray-900 dark:text-white">
                {JSON.stringify(generateWhatsAppPayload(), null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Sidebar - Summary & Send */}
        <div className="space-y-6">
          {/* Cost Estimate */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
            <div className="flex items-start gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="text-green-900 dark:text-green-100 mb-1">Estimated Cost</h3>
                <p className="text-3xl text-green-600 dark:text-green-400">
                  ${calculateEstimatedCost()}
                </p>
              </div>
            </div>
            <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <p>Recipients: {sendMode === 'single' ? 1 : bulkRecipients.length}</p>
              {selectedTemplateData && (
                <p>Category: {selectedTemplateData.category}</p>
              )}
            </div>
          </div>

          {/* Send Summary */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg text-gray-900 dark:text-white mb-4">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Send Mode:</span>
                <span className="text-gray-900 dark:text-white capitalize">{sendMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Message Type:</span>
                <span className="text-gray-900 dark:text-white capitalize">{messageType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
                <span className="text-gray-900 dark:text-white">
                  {sendMode === 'single' ? '1' : bulkRecipients.length}
                </span>
              </div>
              {scheduleMessage && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Scheduled:</span>
                  <span className="text-gray-900 dark:text-white">
                    {scheduleDate} {scheduleTime}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Send className="w-5 h-5" />
            {scheduleMessage ? 'Schedule Message' : `Send ${sendMode === 'bulk' ? 'to All' : 'Message'}`}
          </button>

          {/* WhatsApp Preview */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-3">WhatsApp Preview</h3>
            <div className="bg-[#e5ddd5] dark:bg-gray-800 rounded-lg p-4">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm max-w-[80%]">
                {messageType === 'template' && selectedTemplateData ? (
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedTemplateData.content.replace(/\{\{(\d+)\}\}/g, (match, num) => {
                      const varName = selectedTemplateData.variables[parseInt(num) - 1];
                      return placeholders[varName] || match;
                    })}
                  </p>
                ) : messageType === 'text' ? (
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {textMessage || 'Your message will appear here...'}
                  </p>
                ) : (
                  <div className="text-center">
                    <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mb-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    {textMessage && (
                      <p className="text-sm text-gray-900 dark:text-white">{textMessage}</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2 text-right">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Now
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Progress Modal */}
      {showBulkProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-xl text-gray-900 dark:text-white mb-4">Sending Messages</h3>
            <div className="space-y-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{
                    width: `${(bulkProgress.sent / bulkProgress.total) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl text-green-600 dark:text-green-400">{bulkProgress.sent}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Sent</p>
                </div>
                <div>
                  <p className="text-2xl text-gray-900 dark:text-white">{bulkProgress.total}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                </div>
                <div>
                  <p className="text-2xl text-red-600 dark:text-red-400">{bulkProgress.failed}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Failed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}