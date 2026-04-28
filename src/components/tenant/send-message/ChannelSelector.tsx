import { MessageSquare, Phone, Mail, Bell } from 'lucide-react';

interface ChannelSelectorProps {
  channel: 'whatsapp' | 'sms' | 'email' | 'fcm';
  onChannelChange: (channel: 'whatsapp' | 'sms' | 'email' | 'fcm') => void;
}

export function ChannelSelector({ channel, onChannelChange }: ChannelSelectorProps) {
  const channels = [
    { id: 'whatsapp' as const, name: 'WhatsApp', icon: MessageSquare, color: 'green' },
    { id: 'sms' as const, name: 'SMS', icon: Phone, color: 'blue' },
    { id: 'email' as const, name: 'Email', icon: Mail, color: 'purple' },
    { id: 'fcm' as const, name: 'FCM', icon: Bell, color: 'orange' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Select Channel
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {channels.map((ch) => {
          const Icon = ch.icon;
          const isActive = channel === ch.id;
          const colorClasses = {
            green: isActive ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            blue: isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            purple: isActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            orange: isActive ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
          };

          return (
            <button
              key={ch.id}
              onClick={() => onChannelChange(ch.id)}
              className={`px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${colorClasses[ch.color]}`}
            >
              <Icon className="w-5 h-5" />
              {ch.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

