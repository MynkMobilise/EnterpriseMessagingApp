import { useState } from 'react';
import { ChannelSelector } from './ChannelSelector';
import { SendWhatsAppMessage } from './channels/SendWhatsAppMessage';
import { SendSMSMessage } from './channels/SendSMSMessage';
import { SendEmailMessage } from './channels/SendEmailMessage';
import { SendFCMMessage } from './channels/SendFCMMessage';
import type { Channel } from './types';

export function SendMessage() {
  const [channel, setChannel] = useState<Channel>('whatsapp');

  const renderChannelComponent = () => {
    switch (channel) {
      case 'whatsapp':
        return <SendWhatsAppMessage />;
      case 'sms':
        return <SendSMSMessage />;
      case 'email':
        return <SendEmailMessage />;
      case 'fcm':
        return <SendFCMMessage />;
      default:
        return <SendWhatsAppMessage />;
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl text-gray-900 dark:text-white mb-2">Send Message</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Send messages via WhatsApp, SMS, Email, or FCM to single or multiple recipients
        </p>
      </div>

      {/* Channel Selection */}
      <ChannelSelector channel={channel} onChannelChange={setChannel} />

      {/* Channel-specific form */}
      {renderChannelComponent()}
    </div>
  );
}

