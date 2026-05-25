import { useState, useEffect } from 'react';
import { Send, Clock, IndianRupee, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../../utils/api';
import { useOrganization } from '../../../../contexts/OrganizationContext';
import { SendModeSelector } from '../SendModeSelector';
import { RecipientSelector } from '../shared/RecipientSelector';
import { MessageComposer } from '../shared/MessageComposer';
import type { SendMode, MessageType, Recipient, MessageData, Template } from '../types';
import { estimateCost, formatINR, rateBreakdown } from '../../../../utils/pricing';

export function SendSMSMessage() {
  const [sendMode, setSendMode] = useState<SendMode>('single');
  const [messageType, setMessageType] = useState<MessageType>('template');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedSmsProvider, setSelectedSmsProvider] = useState<string>('');
  const [availableSmsProviders, setAvailableSmsProviders] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [placeholders, setPlaceholders] = useState<{ [key: string]: string }>({});
  const [textMessage, setTextMessage] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedTemplateData, setSelectedTemplateData] = useState<Template | null>(null);

  const { currentOrganization } = useOrganization();

  // SMS pricing — transactional vs promotional. Falls back to template
  // category when present; otherwise assume promotional (the safer/higher rate).
  const recipientCount = sendMode === 'single' ? 1 : recipients.length;
  const smsCategory = selectedTemplateData?.category || 'promotional';
  const cost = estimateCost({ channel: 'sms', category: smsCategory, recipientCount });

  // Fetch available SMS providers
  useEffect(() => {
    if (!currentOrganization) return;

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
    fetchSmsProviders();
  }, [currentOrganization?.id]);

  const handleSend = async (skipApproval: boolean) => {
    if (!selectedSmsProvider) {
      toast.error('Please select an SMS provider');
      return;
    }

    if (sendMode === 'single') {
      if (!phoneNumber) {
        toast.error('Please enter a phone number');
        return;
      }
    } else {
      if (recipients.length === 0) {
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
        const bulkRecipients = recipients.map((r) => ({
          phone: r.phone,
          name: r.name,
          variables: placeholders,
        }));

        const response = await apiService.messages.sendBulk({
          name: `Bulk SMS send ${new Date().toISOString()}`,
          channel: 'sms',
          smsProvider: selectedSmsProvider,
          templateId: selectedTemplate,
          recipients: bulkRecipients,
          priority: 'normal',
          skipApproval,
        });

        if (response.success) {
          toast.success(
            skipApproval
              ? `Bulk send initiated! ${bulkRecipients.length} messages queued`
              : `Bulk send submitted for approval (${bulkRecipients.length} messages)`
          );
        }
      } else {
        toast.loading(skipApproval ? 'Sending message...' : 'Submitting for approval...', {
          id: 'send-message',
        });

        const messageData: MessageData = {
          channel: 'sms',
          messageType: messageType === 'template' ? 'template' : 'text',
          recipientPhone: phoneNumber,
          smsProvider: selectedSmsProvider,
          priority: 'normal',
          skipApproval,
        };

        if (messageType === 'template') {
          messageData.templateId = selectedTemplate;
          messageData.variables = placeholders;
        } else {
          messageData.content = textMessage;
        }

        const response = await apiService.messages.send(messageData);

        if (response.success) {
          toast.success(
            skipApproval ? 'Message sent successfully!' : 'Submitted for approval',
            { id: 'send-message' }
          );
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
    }
  };

  return (
    <div className="space-y-6">
      {/* SMS Provider Selection */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
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

      <SendModeSelector sendMode={sendMode} onModeChange={setSendMode} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recipients */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg text-gray-900 dark:text-white mb-4">
              {sendMode === 'single' ? 'Recipient' : 'Recipients'}
            </h3>
            <RecipientSelector
              channel="sms"
              sendMode={sendMode}
              recipients={recipients}
              onRecipientsChange={setRecipients}
              selectedContactId={selectedContactId}
              onContactSelect={setSelectedContactId}
              phoneNumber={phoneNumber}
              onPhoneNumberChange={setPhoneNumber}
            />
          </div>

          {/* Message Composer */}
          <MessageComposer
            channel="sms"
            messageType={messageType}
            onMessageTypeChange={setMessageType}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={setSelectedTemplate}
            placeholders={placeholders}
            onPlaceholderChange={setPlaceholders}
            textMessage={textMessage}
            onTextMessageChange={setTextMessage}
            attachment={null}
            onAttachmentChange={() => {}}
            onSelectedTemplateChange={setSelectedTemplateData}
          />

          {/* Advanced Options */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg text-gray-900 dark:text-white mb-4">Advanced Options</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={scheduleMessage}
                onChange={(e) => setScheduleMessage(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Schedule for later</span>
              </div>
            </label>
            {scheduleMessage && (
              <div className="grid grid-cols-2 gap-4 mt-4 ml-7">
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cost Estimate */}
          <div className="colorful bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
            <div className="flex items-start gap-3 mb-4">
              <IndianRupee className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-blue-900 dark:text-blue-100 mb-1">Estimated Cost</h3>
                <p className="text-3xl text-blue-600 dark:text-blue-400">{formatINR(cost)}</p>
              </div>
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>Recipients: {recipientCount}</p>
              <p className="capitalize">Type: {smsCategory}</p>
              <p className="text-xs opacity-80 pt-1">{rateBreakdown({ channel: 'sms', category: smsCategory, recipientCount })}</p>
            </div>
          </div>

          {/* Send Buttons — two parallel actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSend(false)}
              className="px-3 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md text-sm"
              title="Submit this message for review by a manager"
            >
              <Send className="w-4 h-4" />
              Send for Approval
            </button>
            <button
              onClick={() => handleSend(true)}
              className="px-3 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md text-sm"
              title="Approve and send immediately (requires approval permission)"
            >
              <CheckCircle className="w-4 h-4" />
              Approve &amp; Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

