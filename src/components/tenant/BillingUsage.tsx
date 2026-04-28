import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner@2.0.3';
import { useOrganization } from '../../contexts/OrganizationContext';
import { OrganizationBadge } from '../OrganizationBadge';

interface MonthlyUsageData {
  month: string;
  messages: number;
}

interface CategoryCost {
  category: string;
  cost: number;
  color: string;
}

interface CountryCost {
  country: string;
  messages: number;
  cost: number;
}

export function BillingUsage() {
  const { currentOrganization } = useOrganization();
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsageData[]>([]);
  const [categoryCosts, setCategoryCosts] = useState<CategoryCost[]>([]);
  const [countryCosts, setCountryCosts] = useState<CountryCost[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch billing data - replace with actual API call
  useEffect(() => {
    // fetchBillingData().then(data => {
    //   setMonthlyUsage(data.monthlyUsage);
    //   setCategoryCosts(data.categoryCosts);
    //   setCountryCosts(data.countryCosts);
    // });
    setLoading(false);
  }, [currentOrganization]);

  return (
    <div className="p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h1 className="text-2xl text-gray-900 dark:text-white">Billing & Usage</h1>
          <button
            onClick={() => toast.success('Invoice exported successfully')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4" />
            Export Invoice PDF
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          View your monthly usage and billing information
        </p>
      </div>

      {/* Current Month Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl p-6 text-white">
          <p className="text-blue-100 mb-2">Current Bill</p>
          <p className="text-3xl mb-1">$95.80</p>
          <p className="text-sm text-blue-100">June 2024</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Messages This Month</p>
          <p className="text-3xl text-gray-900 dark:text-white">1,247</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quota Remaining</p>
          <p className="text-3xl text-gray-900 dark:text-white">8,753</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Next Billing Date</p>
          <p className="text-xl text-gray-900 dark:text-white">Jul 1, 2024</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Message Usage */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-gray-900 dark:text-white mb-6">Monthly Message Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="messages" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-gray-900 dark:text-white mb-6">Cost by Template Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryCosts}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="cost"
              >
                {categoryCosts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {categoryCosts.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-700 dark:text-gray-300">{item.category}</span>
                </div>
                <span className="text-gray-900 dark:text-white">${item.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cost by Country */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-gray-900 dark:text-white">Cost per Country</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {countryCosts.map((country) => (
              <tr key={country.country} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900 dark:text-white">{country.country}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {country.messages.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900 dark:text-white">
                    ${country.cost.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ${(country.cost / country.messages).toFixed(4)}/msg
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Plan Info */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
        <h3 className="text-purple-900 dark:text-purple-100 mb-4">Current Plan: Professional</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-1">Monthly Base Fee</p>
            <p className="text-2xl text-purple-900 dark:text-purple-100">$49.00</p>
          </div>
          <div>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-1">Included Messages</p>
            <p className="text-2xl text-purple-900 dark:text-purple-100">10,000</p>
          </div>
          <div>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-1">Overage Rate</p>
            <p className="text-2xl text-purple-900 dark:text-purple-100">$0.05/msg</p>
          </div>
        </div>
        <button className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20">
          Upgrade Plan
        </button>
      </div>
    </div>
  );
}