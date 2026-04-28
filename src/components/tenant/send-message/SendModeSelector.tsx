import { MessageSquare, Users } from 'lucide-react';

interface SendModeSelectorProps {
  sendMode: 'single' | 'bulk';
  onModeChange: (mode: 'single' | 'bulk') => void;
}

export function SendModeSelector({ sendMode, onModeChange }: SendModeSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-2 mb-6 inline-flex gap-2">
      <button
        onClick={() => onModeChange('single')}
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
        onClick={() => onModeChange('bulk')}
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
  );
}

