import { Building2 } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';

export function OrganizationBadge() {
  const { currentOrganization } = useOrganization();

  if (!currentOrganization) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      {currentOrganization.logo ? (
        <img src={currentOrganization.logo} alt={currentOrganization.name} className="w-5 h-5 rounded" />
      ) : (
        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      )}
      <span className="text-sm text-blue-900 dark:text-blue-100">{currentOrganization.name}</span>
      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full capitalize">
        {currentOrganization.plan}
      </span>
    </div>
  );
}
