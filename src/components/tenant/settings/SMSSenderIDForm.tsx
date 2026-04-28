interface SMSSenderIDFormProps {
  senderId: string;
  onSenderIdChange: (value: string) => void;
}

export function SMSSenderIDForm({
  senderId,
  onSenderIdChange,
}: SMSSenderIDFormProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg text-gray-900 dark:text-white mb-4">Sender ID</h3>
      <div>
        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
          Default Sender ID
        </label>
        <input
          type="text"
          value={senderId}
          onChange={(e) => onSenderIdChange(e.target.value)}
          placeholder="Enter sender ID (e.g., ACME)"
          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-1">
          The sender ID that will appear in SMS messages
        </p>
      </div>
    </div>
  );
}

