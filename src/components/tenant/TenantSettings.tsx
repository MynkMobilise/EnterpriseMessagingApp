import { useState, useEffect } from 'react';
import { MessageSquare, Smartphone, Shield, Bell, Building, Mail } from 'lucide-react';
import { WhatsAppSettings } from './settings/WhatsAppSettings';
import { SMSSettings } from './settings/SMSSettings';
import { EmailSettings } from './settings/EmailSettings';
import { FCMSettings } from './settings/FCMSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { NotificationSettings } from './settings/NotificationSettings';

export function TenantSettings() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms' | 'email' | 'fcm' | 'security' | 'notifications'>('whatsapp');


  const tabs = [
    { id: 'whatsapp', label: 'WhatsApp API', icon: MessageSquare },
    { id: 'sms', label: 'SMS API', icon: Smartphone },
    { id: 'email', label: 'Email API', icon: Mail },
    { id: 'fcm', label: 'FCM API', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm transition-all flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'whatsapp' && <WhatsAppSettings />}
      {activeTab === 'sms' && <SMSSettings />}
      {activeTab === 'email' && <EmailSettings />}
      {activeTab === 'fcm' && <FCMSettings />}
      {activeTab === 'security' && <SecuritySettings />}
      {activeTab === 'notifications' && <NotificationSettings />}
    </div>
  );
}