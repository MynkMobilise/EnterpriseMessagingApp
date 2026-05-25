import { MessageSquare, Phone, Mail, Bell } from 'lucide-react';

/**
 * Channel selector — mirrors the AppLayout main sidebar pattern. Uses a
 * scoped <style> block for responsive layout because the project's
 * pre-compiled Tailwind in index.css doesn't contain the md:flex-col /
 * md:sticky / md:overflow-visible utilities I'd otherwise reach for.
 */
interface ChannelSelectorProps {
  channel: 'whatsapp' | 'sms' | 'email' | 'fcm';
  onChannelChange: (channel: 'whatsapp' | 'sms' | 'email' | 'fcm') => void;
}

const CHANNELS = [
  { id: 'whatsapp' as const, name: 'WhatsApp', icon: MessageSquare },
  { id: 'sms' as const, name: 'SMS', icon: Phone },
  { id: 'email' as const, name: 'Email', icon: Mail },
  { id: 'fcm' as const, name: 'FCM', icon: Bell },
];

export function ChannelSelector({ channel, onChannelChange }: ChannelSelectorProps) {
  return (
    <aside className="sm-channel-rail">
      <style>{`
        .sm-channel-rail-nav {
          display: flex;
          flex-direction: row;
          gap: 0.25rem;
          overflow-x: auto;
        }
        .sm-channel-rail-item { flex-shrink: 0; }
        @media (min-width: 768px) {
          .sm-channel-rail { position: sticky; top: 5rem; align-self: start; }
          .sm-channel-rail-nav {
            flex-direction: column;
            overflow-x: visible;
          }
          .sm-channel-rail-item { flex-shrink: 1; width: 100%; }
        }
      `}</style>
      <p className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Channel
      </p>
      <nav className="sm-channel-rail-nav">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const isActive = channel === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => onChannelChange(ch.id)}
              className={`sm-channel-rail-item flex items-center gap-2 px-2.5 py-2 rounded-md transition-all text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{ch.name}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
