import { Building2, Check, Filter } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useState } from 'react';

interface OrganizationFilterProps {
  selectedOrgId?: string | 'all';
  onSelectOrg: (orgId: string | 'all') => void;
  allowAll?: boolean;
}

export function OrganizationFilter({ selectedOrgId = 'all', onSelectOrg, allowAll = true }: OrganizationFilterProps) {
  const { organizations, currentOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOrg = selectedOrgId === 'all' 
    ? null 
    : organizations.find(org => org.id === selectedOrgId);

  const getDisplayName = () => {
    if (selectedOrgId === 'all') return 'All Organizations';
    return selectedOrg?.name || currentOrganization?.name || 'Select Organization';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
      >
        <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-900 dark:text-white">{getDisplayName()}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 px-3 py-2">
                Filter by Organization
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {allowAll && (
                <button
                  onClick={() => {
                    onSelectOrg('all');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-500 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">
                      All Organizations
                    </span>
                  </div>
                  {selectedOrgId === 'all' && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              )}

              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    onSelectOrg(org.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="w-8 h-8 rounded-lg" />
                    ) : (
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-sm text-gray-900 dark:text-white truncate">
                        {org.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {org.plan}
                      </div>
                    </div>
                  </div>
                  {selectedOrgId === org.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
