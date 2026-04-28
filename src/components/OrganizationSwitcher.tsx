import { useState } from 'react';
import { Building2, Check, ChevronDown, Plus, Settings } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';

interface OrganizationSwitcherProps {
  onManageOrganizations?: () => void;
  onCreateOrganization?: () => void;
}

export function OrganizationSwitcher({ onManageOrganizations, onCreateOrganization }: OrganizationSwitcherProps) {
  const { currentOrganization, organizations, switchOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitchOrganization = (orgId: string) => {
    switchOrganization(orgId);
    setIsOpen(false);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300';
      case 'professional':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      case 'starter':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'trial':
        return 'bg-orange-500';
      case 'suspended':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!currentOrganization) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="relative flex-shrink-0">
          {currentOrganization.logo ? (
            <img
              src={currentOrganization.logo}
              alt={currentOrganization.name}
              className="w-10 h-10 rounded-lg"
            />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          )}
          <div
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${getStatusColor(
              currentOrganization.status
            )}`}
          />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm text-gray-900 dark:text-white truncate">
            {currentOrganization.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {currentOrganization.plan} Plan
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 px-3 py-2">
                Switch Organization
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrganization(org.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="w-10 h-10 rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${getStatusColor(
                        org.status
                      )}`}
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {org.name}
                      </span>
                      {org.id === currentOrganization.id && (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getPlanBadgeColor(
                          org.plan
                        )}`}
                      >
                        {org.plan}
                      </span>
                      {org.status === 'trial' && (
                        <span className="text-xs text-orange-600 dark:text-orange-400">
                          Trial
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
              {onCreateOrganization && (
                <button
                  onClick={() => {
                    onCreateOrganization();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                >
                  <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-gray-900 dark:text-white">
                    Create Organization
                  </span>
                </button>
              )}
              {onManageOrganizations && (
                <button
                  onClick={() => {
                    onManageOrganizations();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-900 dark:text-white">
                    Manage Organizations
                  </span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
