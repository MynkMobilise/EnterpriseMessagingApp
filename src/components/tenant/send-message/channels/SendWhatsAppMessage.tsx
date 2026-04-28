import { useState } from 'react';
import { Send, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../../utils/api';
import { SendModeSelector } from '../SendModeSelector';
import { RecipientSelector } from '../shared/RecipientSelector';
import { MessageComposer } from '../shared/MessageComposer';
import type { Channel, SendMode, MessageType, Recipient, MessageData } from '../types';

export function SendWhatsAppMessage() {
  const [sendMode, setSendMode] = useState<SendMode>('single');
  const [messageType, setMessageType] = useState<MessageType>('template');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [placeholders, setPlaceholders] = useState<{ [key: string]: string }>({});
  const [textMessage, setTextMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const handleSend = async () => {
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
          name: `Bulk WhatsApp send ${new Date().toISOString()}`,
          channel: 'whatsapp',
          templateId: selectedTemplate,
          recipients: bulkRecipients,
          priority: 'normal',
        });

        if (response.success) {
          toast.success(`Bulk send initiated! ${bulkRecipients.length} messages queued`);
        }
      } else {
        toast.loading('Sending message...', { id: 'send-message' });

        const messageData: MessageData = {
          channel: 'whatsapp',
          messageType: messageType === 'template' ? 'template' : 'text',
          recipientPhone: phoneNumber,
          priority: 'normal',
        };

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
    }
  };

  return (
    <div className="space-y-6">
      <SendModeSelector sendMode={sendMode} onModeChange={setSendMode} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recipients */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg text-gray-900 dark:text-white mb-4">
              {sendMode === 'single' ? 'Recipient' : 'Recipients'}
            </h3>
            <RecipientSelector
              channel="whatsapp"
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
            channel="whatsapp"
            messageType={messageType}
            onMessageTypeChange={setMessageType}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={setSelectedTemplate}
            placeholders={placeholders}
            onPlaceholderChange={setPlaceholders}
            textMessage={textMessage}
            onTextMessageChange={setTextMessage}
            attachment={attachment}
            onAttachmentChange={setAttachment}
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
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
            <div className="flex items-start gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="text-green-900 dark:text-green-100 mb-1">Estimated Cost</h3>
                <p className="text-3xl text-green-600 dark:text-green-400">
                  ${((sendMode === 'single' ? 1 : recipients.length) * 0.005).toFixed(3)}
                </p>
              </div>
            </div>
            <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <p>Recipients: {sendMode === 'single' ? 1 : recipients.length}</p>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
          >
            <Send className="w-5 h-5" />
            {scheduleMessage ? 'Schedule Message' : `Send ${sendMode === 'bulk' ? 'to All' : 'Message'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

