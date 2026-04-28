import { Lock } from 'lucide-react';

interface IPWhitelistingFormProps {
  enabled: boolean;
  ipAddresses: string[];
  onEnabledChange: (value: boolean) => void;
  onIpAddressesChange: (addresses: string[]) => void;
}

export function IPWhitelistingForm({
  enabled,
  ipAddresses,
  onEnabledChange,
  onIpAddressesChange,
}: IPWhitelistingFormProps) {
  const addIpAddress = () => {
    onIpAddressesChange([...ipAddresses, '']);
  };

  const removeIpAddress = (index: number) => {
    onIpAddressesChange(ipAddresses.filter((_, i) => i !== index));
  };

  const updateIpAddress = (index: number, value: string) => {
    const newIps = [...ipAddresses];
    newIps[index] = value;
    onIpAddressesChange(newIps);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg text-gray-900 dark:text-white mb-1">IP Whitelisting</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Restrict API access to specific IP addresses
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Only these IP addresses will be allowed to access your APIs:
          </p>
          {ipAddresses.map((ip, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={ip}
                onChange={(e) => updateIpAddress(index, e.target.value)}
                placeholder="192.168.1.1"
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <button
                onClick={() => removeIpAddress(index)}
                className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={addIpAddress}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            + Add IP Address
          </button>
        </div>
      )}
    </div>
  );
}

