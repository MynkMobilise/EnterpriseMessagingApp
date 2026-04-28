import { useState } from 'react';
import { Phone, CheckCircle2, AlertCircle, Plus, Link2 } from 'lucide-react';

export function PhoneNumbersMapping() {
  const phoneNumbers = [
    {
      id: 1,
      phoneNumber: '+1 234 567 8900',
      displayName: 'Acme Support',
      tenant: 'Acme Corporation',
      wabaId: 'WABA-1234567890',
      status: 'verified',
      quality: 'high',
      messagingLimit: 'unlimited',
      dailyMessages: 12450,
    },
    {
      id: 2,
      phoneNumber: '+1 234 567 8901',
      displayName: 'Acme Sales',
      tenant: 'Acme Corporation',
      wabaId: 'WABA-1234567890',
      status: 'verified',
      quality: 'high',
      messagingLimit: 'unlimited',
      dailyMessages: 8320,
    },
    {
      id: 3,
      phoneNumber: '+44 20 7123 4567',
      displayName: 'TechStart Support',
      tenant: 'TechStart Inc',
      wabaId: 'WABA-0987654321',
      status: 'verified',
      quality: 'medium',
      messagingLimit: '10000',
      dailyMessages: 5680,
    },
    {
      id: 4,
      phoneNumber: '+1 555 123 4567',
      displayName: 'FinServe Alerts',
      tenant: 'FinServe Solutions',
      wabaId: 'WABA-5555555555',
      status: 'pending',
      quality: 'unknown',
      messagingLimit: '1000',
      dailyMessages: 0,
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-slate-900 dark:text-white">Phone Numbers Mapping</h1>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Map Phone Number
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Manage phone number assignments to tenants and WABA accounts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total Numbers</p>
          <p className="text-3xl text-slate-900 dark:text-white">10</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Verified</p>
          <p className="text-3xl text-green-600">9</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">High Quality</p>
          <p className="text-3xl text-blue-600">6</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Daily Messages</p>
          <p className="text-3xl text-slate-900 dark:text-white">26.5K</p>
        </div>
      </div>

      {/* Phone Numbers Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Display Name
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                WABA
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Quality Rating
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Messaging Limit
              </th>
              <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Today's Messages
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
            {phoneNumbers.map((phone) => (
              <tr key={phone.id} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-slate-900 dark:text-white font-mono">{phone.phoneNumber}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-900 dark:text-white">{phone.displayName}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{phone.tenant}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-slate-400" />
                    <code className="text-xs text-slate-600 dark:text-slate-400">{phone.wabaId}</code>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {phone.status === 'verified' ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Pending</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      phone.quality === 'high'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : phone.quality === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                        : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {phone.quality}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-900 dark:text-white">
                    {phone.messagingLimit === 'unlimited' ? 'Unlimited' : `${phone.messagingLimit}/day`}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-900 dark:text-white">
                    {phone.dailyMessages.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quality Rating Info */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-sm text-blue-900 dark:text-blue-200 mb-3">Quality Rating Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-900 dark:text-blue-200 mb-1"><strong>High Quality:</strong></p>
            <p className="text-blue-700 dark:text-blue-300">Unlimited messaging tier. Maintain quality to keep this status.</p>
          </div>
          <div>
            <p className="text-blue-900 dark:text-blue-200 mb-1"><strong>Medium Quality:</strong></p>
            <p className="text-blue-700 dark:text-blue-300">Limited to 10,000 messages per day. Improve quality to increase limit.</p>
          </div>
          <div>
            <p className="text-blue-900 dark:text-blue-200 mb-1"><strong>Low Quality:</strong></p>
            <p className="text-blue-700 dark:text-blue-300">Limited to 1,000 messages per day. Risk of number suspension.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
