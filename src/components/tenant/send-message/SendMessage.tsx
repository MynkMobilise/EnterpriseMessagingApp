import { useState, useEffect } from 'react';
import { ChannelSelector } from './ChannelSelector';
import { SendWhatsAppMessage } from './channels/SendWhatsAppMessage';
import { SendSMSMessage } from './channels/SendSMSMessage';
import { SendEmailMessage } from './channels/SendEmailMessage';
import { SendFCMMessage } from './channels/SendFCMMessage';
import type { Channel } from './types';
import { useAuth } from '../../../contexts/AuthContext';

export function SendMessage() {
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const { hasFeature } = useAuth();

  // If the default channel ('whatsapp') is disabled for this tenant, pick the
  // first one that IS enabled. Without this the page renders an active tab
  // for a channel the operator can't use.
  useEffect(() => {
    const order: Channel[] = ['whatsapp', 'sms', 'email', 'fcm'];
    const enabled = order.filter((c) => hasFeature(`channels.${c}` as any));
    if (enabled.length === 0) return; // nothing enabled — sub-page will show its own state
    if (!enabled.includes(channel)) setChannel(enabled[0]);
  }, [hasFeature, channel]);

  const renderChannelComponent = () => {
    // Defensive: if this channel got disabled while the user was on it, show
    // an empty-state. Real backend rejection covers this with a 403 on send.
    if (!hasFeature(`channels.${channel}` as any)) {
      return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            The {channel.toUpperCase()} channel is not enabled for your organization.
            Contact your administrator if you need access.
          </p>
        </div>
      );
    }
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
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 dark:text-white mb-2">Send Message</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Send messages via WhatsApp, SMS, Email, or FCM to single or multiple recipients
        </p>
      </div>

      {/* 180px side rail + flexible content. Inline styles + a tiny media
          query stylesheet because the pre-compiled Tailwind in index.css
          doesn't include arbitrary grid-template-columns values. */}
      <style>{`
        .sm-page-layout { display: block; }
        @media (min-width: 768px) {
          .sm-page-layout {
            display: grid;
            /* 144px is the sweet spot for the rail — narrow enough to feel
               slim, wide enough that the labels "WhatsApp / SMS / Email /
               FCM" fit on a single line without truncation. Going below
               ~120px will start clipping into the next grid column. */
            grid-template-columns: 144px 1fr;
            gap: 1.25rem;
            align-items: start;
          }
        }
      `}</style>
      <div className="sm-page-layout">
        <ChannelSelector channel={channel} onChannelChange={setChannel} />
        <div style={{ minWidth: 0 }}>
          {renderChannelComponent()}
        </div>
      </div>
    </div>
  );
}

