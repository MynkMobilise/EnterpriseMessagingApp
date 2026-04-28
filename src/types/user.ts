export type UserRole = 'super_admin' | 'admin' | 'manager' | 'operator' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  organizationName?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
  permissions: UserPermissions;
}

export interface UserPermissions {
  // Message Permissions
  canSendMessages: boolean;
  canApproveMessages: boolean;
  canViewMessageLogs: boolean;
  canExportMessageLogs: boolean;
  
  // Template Permissions
  canCreateTemplates: boolean;
  canEditTemplates: boolean;
  canDeleteTemplates: boolean;
  canApproveTemplates: boolean;
  
  // Contact Permissions
  canManageContacts: boolean;
  canImportContacts: boolean;
  canExportContacts: boolean;
  
  // User Management Permissions
  canManageUsers: boolean;
  canViewUsers: boolean;
  canAssignRoles: boolean;
  
  // Organization Permissions
  canManageOrganization: boolean;
  canViewBilling: boolean;
  canManageAPIKeys: boolean;
  
  // Reports & Analytics
  canViewReports: boolean;
  canExportReports: boolean;
  
  // Settings Permissions
  canManageSettings: boolean;
  canManageIntegrations: boolean;
}

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  permissions?: Partial<UserPermissions>;
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  super_admin: {
    canSendMessages: true,
    canApproveMessages: true,
    canViewMessageLogs: true,
    canExportMessageLogs: true,
    canCreateTemplates: true,
    canEditTemplates: true,
    canDeleteTemplates: true,
    canApproveTemplates: true,
    canManageContacts: true,
    canImportContacts: true,
    canExportContacts: true,
    canManageUsers: true,
    canViewUsers: true,
    canAssignRoles: true,
    canManageOrganization: true,
    canViewBilling: true,
    canManageAPIKeys: true,
    canViewReports: true,
    canExportReports: true,
    canManageSettings: true,
    canManageIntegrations: true,
  },
  admin: {
    canSendMessages: true,
    canApproveMessages: true,
    canViewMessageLogs: true,
    canExportMessageLogs: true,
    canCreateTemplates: true,
    canEditTemplates: true,
    canDeleteTemplates: true,
    canApproveTemplates: true,
    canManageContacts: true,
    canImportContacts: true,
    canExportContacts: true,
    canManageUsers: true,
    canViewUsers: true,
    canAssignRoles: true,
    canManageOrganization: true,
    canViewBilling: true,
    canManageAPIKeys: true,
    canViewReports: true,
    canExportReports: true,
    canManageSettings: true,
    canManageIntegrations: true,
  },
  manager: {
    canSendMessages: true,
    canApproveMessages: true,
    canViewMessageLogs: true,
    canExportMessageLogs: true,
    canCreateTemplates: true,
    canEditTemplates: true,
    canDeleteTemplates: false,
    canApproveTemplates: true,
    canManageContacts: true,
    canImportContacts: true,
    canExportContacts: true,
    canManageUsers: false,
    canViewUsers: true,
    canAssignRoles: false,
    canManageOrganization: false,
    canViewBilling: true,
    canManageAPIKeys: false,
    canViewReports: true,
    canExportReports: true,
    canManageSettings: false,
    canManageIntegrations: false,
  },
  operator: {
    canSendMessages: true,
    canApproveMessages: false,
    canViewMessageLogs: true,
    canExportMessageLogs: false,
    canCreateTemplates: true,
    canEditTemplates: true,
    canDeleteTemplates: false,
    canApproveTemplates: false,
    canManageContacts: true,
    canImportContacts: true,
    canExportContacts: false,
    canManageUsers: false,
    canViewUsers: true,
    canAssignRoles: false,
    canManageOrganization: false,
    canViewBilling: false,
    canManageAPIKeys: false,
    canViewReports: true,
    canExportReports: false,
    canManageSettings: false,
    canManageIntegrations: false,
  },
  viewer: {
    canSendMessages: false,
    canApproveMessages: false,
    canViewMessageLogs: true,
    canExportMessageLogs: false,
    canCreateTemplates: false,
    canEditTemplates: false,
    canDeleteTemplates: false,
    canApproveTemplates: false,
    canManageContacts: false,
    canImportContacts: false,
    canExportContacts: false,
    canManageUsers: false,
    canViewUsers: true,
    canAssignRoles: false,
    canManageOrganization: false,
    canViewBilling: false,
    canManageAPIKeys: false,
    canViewReports: true,
    canExportReports: false,
    canManageSettings: false,
    canManageIntegrations: false,
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full system access across all organizations',
  admin: 'Full access to organization and all features',
  manager: 'Can manage messages, templates, and approve content',
  operator: 'Can send messages and manage contacts',
  viewer: 'Read-only access to reports and logs',
};
