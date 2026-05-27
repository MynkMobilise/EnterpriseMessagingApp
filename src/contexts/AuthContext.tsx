import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiService } from '../utils/api';

/**
 * Permission keys mirror what the backend middleware enforces. Kept in sync
 * with backend/src/services/authService.js → getDefaultPermissions.
 */
export type PermissionKey =
  | 'canSendMessages'
  | 'canApproveMessages'
  | 'canManageUsers'
  | 'canManageTemplates'
  | 'canManageContacts'
  | 'canViewReports'
  | 'canManageSettings'
  | 'canManageAPIKeys'
  | 'canAssignRoles'
  | 'canManageOrganization'
  | 'canViewLiveChat'
  | 'canViewLeadership';

export type Role = 'super_admin' | 'admin' | 'manager' | 'operator' | 'viewer';

// Per-tenant feature flags. Mirror of backend/src/config/planFeatures.js —
// keys here should match what effectiveFlags(org) returns from /auth/me.
export interface FeatureFlags {
  channels?: { whatsapp?: boolean; sms?: boolean; email?: boolean; fcm?: boolean };
  hrmsSync?: boolean;
  liveChat?: boolean;
  carouselTemplates?: boolean;
  apiKeyIntegration?: boolean;
  maxCustomRoles?: number;
}

export type FeatureKey =
  | 'channels.whatsapp' | 'channels.sms' | 'channels.email' | 'channels.fcm'
  | 'hrmsSync' | 'liveChat' | 'carouselTemplates' | 'apiKeyIntegration';

export interface AuthUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  organizationId: number;
  permissions: Partial<Record<PermissionKey, boolean>>;
  organization?: { id: number; name: string; slug?: string; plan?: string } | null;
  featureFlags?: FeatureFlags;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  /** True if the user has the named permission (or is super_admin). */
  hasPermission: (perm: PermissionKey) => boolean;
  /** True if the user holds any of the listed roles. */
  hasRole: (...roles: Role[]) => boolean;
  /** True if the named feature is enabled for the current tenant. Accepts
   *  dot-paths like 'channels.sms'. Super admin always passes. */
  hasFeature: (key: FeatureKey) => boolean;
  /** Force a re-fetch of /auth/me (e.g. after role/permission change). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    // Skip the network call when there's no token — the api response
    // interceptor turns 401s into a "session expired" toast + redirect to /,
    // which we don't want after a legitimate logout.
    if (!localStorage.getItem('accessToken')) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const r = await apiService.auth.getCurrentUser();
      if (r?.success && r.data) {
        setUser(r.data as AuthUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const hasPermission = (perm: PermissionKey) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true; // platform owner always passes
    return Boolean(user.permissions?.[perm]);
  };

  const hasRole = (...roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasFeature = (key: FeatureKey): boolean => {
    if (!user) return false;
    // Super admin can always reach every page — UI gating is just a quality-
    // of-life signal, not a security boundary (backend enforces).
    if (user.role === 'super_admin') return true;
    const flags = user.featureFlags || {};
    const v = key.split('.').reduce<any>((acc, k) => (acc == null ? undefined : acc[k]), flags);
    return Boolean(v);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, hasPermission, hasRole, hasFeature, refresh: fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
