import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '../utils/api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  industry?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  messageQuota: number;
  usedMessages: number;
  userCount?: number;
  settings?: {
    timezone?: string;
    currency?: string;
    language?: string;
  };
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  switchOrganization: (orgId: string) => void;
  addOrganization: (orgData: Partial<Organization>) => Promise<Organization>;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => Promise<Organization>;
  deleteOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load organizations from API
  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.organizations.list();
      console.log('OrganizationContext - API response:', response);
      if (response.success && response.data) {
        const transformedOrgs: Organization[] = response.data.map((org: any) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: org.logoUrl,
          industry: org.industry || '',
          plan: org.plan || 'starter',
          status: org.status || 'active',
          createdAt: org.createdAt,
          messageQuota: org.maxMessagesPerMonth || 10000,
          usedMessages: org.usedMessages || 0,
          userCount: org.userCount || 0,
          settings: org.settings || {},
        }));
        console.log('OrganizationContext - Transformed orgs:', transformedOrgs);
        setOrganizations(transformedOrgs);
        
        const savedOrgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('organizationId');
        if (savedOrgId) {
          const org = transformedOrgs.find((o) => o.id === savedOrgId);
          if (org) {
            setCurrentOrganization(org);
            // Sync both keys
            localStorage.setItem('currentOrganizationId', org.id);
            localStorage.setItem('organizationId', org.id);
          } else {
            setCurrentOrganization(transformedOrgs[0] || null);
            if (transformedOrgs[0]) {
              localStorage.setItem('currentOrganizationId', transformedOrgs[0].id);
              localStorage.setItem('organizationId', transformedOrgs[0].id);
            }
          }
        } else {
          setCurrentOrganization(transformedOrgs[0] || null);
          if (transformedOrgs[0]) {
            localStorage.setItem('currentOrganizationId', transformedOrgs[0].id);
            localStorage.setItem('organizationId', transformedOrgs[0].id);
          }
        }
      } else {
        console.warn('OrganizationContext - API response not successful:', response);
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      // Sync both localStorage keys for API interceptor compatibility
      localStorage.setItem('currentOrganizationId', orgId);
      localStorage.setItem('organizationId', orgId);
    }
  };

  const addOrganization = async (orgData: Partial<Organization>) => {
    try {
      const response = await apiService.organizations.create({
        name: orgData.name || '',
        industry: orgData.industry || '',
        plan: orgData.plan || 'starter',
        status: orgData.status || 'active',
        maxMessagesPerMonth: orgData.messageQuota || 10000,
        maxUsers: 10, // Default
      });
      
      if (response.success && response.data) {
        const newOrg: Organization = {
          id: response.data.id,
          name: response.data.name,
          slug: response.data.slug,
          logo: response.data.logoUrl,
          industry: response.data.industry || '',
          plan: response.data.plan || 'starter',
          status: response.data.status || 'active',
          createdAt: response.data.createdAt,
          messageQuota: response.data.maxMessagesPerMonth || 10000,
          usedMessages: response.data.usedMessages || 0,
          userCount: response.data.userCount || 0,
          settings: response.data.settings || {},
        };
        setOrganizations([...organizations, newOrg]);
        // Refresh the list to get updated data
        await refreshOrganizations();
        return newOrg;
      } else {
        throw new Error(response.error?.message || 'Failed to create organization');
      }
    } catch (error: any) {
      console.error('Failed to create organization:', error);
      // Re-throw with better error message
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to create organization';
      throw new Error(errorMessage);
    }
  };

  const updateOrganization = async (orgId: string, updates: Partial<Organization>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.industry !== undefined) updateData.industry = updates.industry;
      if (updates.plan !== undefined) updateData.plan = updates.plan;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.messageQuota !== undefined) updateData.maxMessagesPerMonth = updates.messageQuota;
      
      const response = await apiService.organizations.update(orgId, updateData);
      
      if (response.success && response.data) {
        const updatedOrg: Organization = {
          id: response.data.id,
          name: response.data.name,
          slug: response.data.slug,
          logo: response.data.logoUrl,
          industry: response.data.industry || '',
          plan: response.data.plan || 'starter',
          status: response.data.status || 'active',
          createdAt: response.data.createdAt,
          messageQuota: response.data.maxMessagesPerMonth || 10000,
          usedMessages: response.data.usedMessages || 0,
          userCount: response.data.userCount || 0,
          settings: response.data.settings || {},
        };
        
        // Refresh the list to get updated data
        await refreshOrganizations();
        return updatedOrg;
      }
    } catch (error: any) {
      console.error('Failed to update organization:', error);
      throw error;
    }
  };

  const deleteOrganization = async (orgId: string) => {
    try {
      const response = await apiService.organizations.delete(orgId);
      if (response.success) {
        // Refresh the list to get updated data
        await refreshOrganizations();
      }
    } catch (error: any) {
      console.error('Failed to delete organization:', error);
      throw error;
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        switchOrganization,
        addOrganization,
        updateOrganization,
        deleteOrganization,
        refreshOrganizations,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
