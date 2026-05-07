import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '../utils/api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  industry?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  description?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  messageQuota: number;
  usedMessages: number;
  userCount?: number;
  // Backwards-compat alias for the backend's snake_case field name
  maxMessagesPerMonth?: number;
  maxUsers?: number;
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
          email: org.email || '',
          phone: org.phone || '',
          website: org.website || '',
          address: org.address || '',
          description: org.description || '',
          plan: org.plan || 'starter',
          status: org.status || 'active',
          createdAt: org.createdAt,
          messageQuota: org.maxMessagesPerMonth || 10000,
          maxMessagesPerMonth: org.maxMessagesPerMonth || 10000,
          maxUsers: org.maxUsers || 10,
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
      // Forward every field the modal collects, including email / phone / website.
      // Email is required by the backend — the welcome email + initial admin
      // login go to that address.
      const payload: any = {
        name: orgData.name || '',
        industry: orgData.industry || '',
        plan: orgData.plan || 'starter',
        status: orgData.status || 'active',
        maxMessagesPerMonth: (orgData as any).messageQuota || (orgData as any).maxMessagesPerMonth || 10000,
        maxUsers: (orgData as any).userCount || (orgData as any).maxUsers || 10,
      };
      if ((orgData as any).email) payload.email = (orgData as any).email;
      if ((orgData as any).phone) payload.phone = (orgData as any).phone;
      if ((orgData as any).website) payload.website = (orgData as any).website;

      const response = await apiService.organizations.create(payload);
      
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
      // Forward every editable field. Previously this dropped email/phone/website/
      // address/description, which silently broke updates for those fields.
      const u = updates as any;
      const updateData: any = {};
      if (u.name !== undefined) updateData.name = u.name;
      if (u.industry !== undefined) updateData.industry = u.industry;
      if (u.plan !== undefined) updateData.plan = u.plan;
      if (u.status !== undefined) updateData.status = u.status;
      if (u.email !== undefined) updateData.email = u.email;
      if (u.phone !== undefined) updateData.phone = u.phone;
      if (u.website !== undefined) updateData.website = u.website;
      if (u.address !== undefined) updateData.address = u.address;
      if (u.description !== undefined) updateData.description = u.description;
      if (u.messageQuota !== undefined) updateData.maxMessagesPerMonth = u.messageQuota;
      if (u.maxMessagesPerMonth !== undefined) updateData.maxMessagesPerMonth = u.maxMessagesPerMonth;
      if (u.userCount !== undefined) updateData.maxUsers = u.userCount;
      if (u.maxUsers !== undefined) updateData.maxUsers = u.maxUsers;
      if (u.settings !== undefined) updateData.settings = u.settings;

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
