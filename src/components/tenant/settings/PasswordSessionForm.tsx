interface PasswordSessionFormProps {
  passwordExpiryDays: number;
  sessionTimeoutMinutes: number;
  onPasswordExpiryDaysChange: (value: number) => void;
  onSessionTimeoutMinutesChange: (value: number) => void;
}

export function PasswordSessionForm({
  passwordExpiryDays,
  sessionTimeoutMinutes,
  onPasswordExpiryDaysChange,
  onSessionTimeoutMinutesChange,
}: PasswordSessionFormProps) {
  return (
    <>
      {/* Password Policy */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg text-gray-900 dark:text-white mb-4">Password Policy</h3>
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Password Expiry (days)
          </label>
          <input
            type="number"
            value={passwordExpiryDays}
            onChange={(e) => onPasswordExpiryDaysChange(Number(e.target.value))}
            min="0"
            max="365"
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of days before passwords expire (0 = never expire)
          </p>
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg text-gray-900 dark:text-white mb-4">Session Management</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Session Timeout
            </label>
            <select
              value={sessionTimeoutMinutes}
              onChange={(e) => onSessionTimeoutMinutesChange(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={0}>Never</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Automatically log out users after period of inactivity
            </p>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300 block">
                  Terminate Other Sessions on Password Change
                </span>
                <span className="text-xs text-gray-500">
                  Log out all other devices when password is changed
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

