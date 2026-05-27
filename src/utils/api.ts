import axios, { AxiosInstance, AxiosError } from 'axios';
import { toast } from 'sonner';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://suchna.onmobilise.com/api/v1';

// Host root for static media. We keep the /api/v1 prefix so prod nginx (which
// only reverse-proxies /api/*) still reaches the backend's static handler —
// backend mounts uploads at BOTH /uploads and /api/v1/uploads for this reason.
// Result: <MEDIA_HOST>/uploads/foo.jpg → https://host/api/v1/uploads/foo.jpg.
export const MEDIA_HOST = API_BASE_URL.replace(/\/+$/, '');

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    const organizationId = localStorage.getItem('organizationId');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (organizationId) {
      config.headers['X-Organization-Id'] = organizationId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const errorMessage = 
      error.response?.data?.error?.message || 
      error.response?.data?.message || 
      error.message || 
      '';

    // Check for token-related errors
    const isTokenError = 
      error.response?.status === 401 ||
      errorMessage.toLowerCase().includes('invalid or expired access token') ||
      errorMessage.toLowerCase().includes('invalid token') ||
      errorMessage.toLowerCase().includes('token expired') ||
      errorMessage.toLowerCase().includes('authentication failed') ||
      errorMessage.toLowerCase().includes('unauthorized');

    if (isTokenError) {
      // Clear all auth-related data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('organizationId');
      localStorage.removeItem('mustChangePassword');
      
      // Show session expired message
      toast.error('Session Expired, Redirecting to Login Screen', {
        description: 'Your session has expired. Please log in again to continue.',
        duration: 3000,
      });
      
      // Redirect to login after a short delay to show the message
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
    return Promise.reject(error);
  }
);

// API Service Functions
export const apiService = {
  // Authentication
  auth: {
    register: async (data: {
      organizationSlug: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    }) => {
      const response = await api.post('/auth/register', data);
      return response.data;
    },

    login: async (data: {
      email: string;
      password: string;
      organizationSlug?: string;
    }) => {
      const response = await api.post('/auth/login', data);
      if (response.data.success && response.data.data) {
        // Store tokens
        localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
        if (response.data.data.user?.organizationId) {
          localStorage.setItem('organizationId', response.data.data.user.organizationId);
        }
        // Store mustChangePassword flag if present
        if (response.data.data.mustChangePassword) {
          localStorage.setItem('mustChangePassword', 'true');
        } else {
          localStorage.removeItem('mustChangePassword');
        }
      }
      return response.data;
    },

    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        // Continue even if logout fails
      } finally {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('organizationId');
      }
    },
    resetRateLimits: async () => {
      const response = await api.post('/auth/reset-rate-limits');
      return response.data;
    },

    // Exchange a partner-signed JWT for our tokens. Persists tokens on success.
    ssoExchange: async (data: { orgSlug: string; token: string }) => {
      const response = await api.post('/auth/sso/exchange', data);
      const payload = response.data?.data;
      if (response.data?.success && payload?.tokens?.accessToken) {
        localStorage.setItem('accessToken', payload.tokens.accessToken);
        if (payload.tokens.refreshToken) localStorage.setItem('refreshToken', payload.tokens.refreshToken);
        if (payload.user?.organizationId) localStorage.setItem('organizationId', payload.user.organizationId);
      }
      return response.data;
    },

    getCurrentUser: async () => {
      const response = await api.get('/auth/me');
      return response.data;
    },

    refreshToken: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await api.post('/auth/refresh', { refreshToken });
      if (response.data.success && response.data.data) {
        localStorage.setItem('accessToken', response.data.data.accessToken);
        if (response.data.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.data.refreshToken);
        }
      }
      return response.data;
    },
  },

  // Organizations
  organizations: {
    list: async (filters?: any) => {
      const response = await api.get('/organizations', { params: filters });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await api.get(`/organizations/${id}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await api.post('/organizations', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await api.put(`/organizations/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/organizations/${id}`);
      return response.data;
    },
    // Super-admin: per-tenant feature flags. Returns { plan, baseline,
    // overrides, effective, keys } so the UI can show which flags came
    // from the plan default vs an explicit override.
    getFeatures: async (id: string | number) => {
      const response = await api.get(`/organizations/${id}/features`);
      return response.data;
    },
    updateFeatures: async (id: string | number, overrides: any) => {
      const response = await api.put(`/organizations/${id}/features`, { overrides });
      return response.data;
    },
  },

  // Contacts
  contacts: {
    list: async (params?: { page?: number; limit?: number; search?: string }) => {
      const response = await api.get('/contacts', { params });
      return response.data;
    },

    getById: async (id: string) => {
      const response = await api.get(`/contacts/${id}`);
      return response.data;
    },

    create: async (data: any) => {
      const response = await api.post('/contacts', data);
      return response.data;
    },

    update: async (id: string, data: any) => {
      const response = await api.put(`/contacts/${id}`, data);
      return response.data;
    },

    delete: async (id: string) => {
      const response = await api.delete(`/contacts/${id}`);
      return response.data;
    },

    import: async (file: File, options?: { skipDuplicates?: boolean; updateExisting?: boolean }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (options) {
        if (options.skipDuplicates !== undefined) {
          formData.append('skipDuplicates', String(options.skipDuplicates));
        }
        if (options.updateExisting !== undefined) {
          formData.append('updateExisting', String(options.updateExisting));
        }
      }
      const response = await api.post('/contacts/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },

    downloadTemplate: async () => {
      const response = await api.get('/contacts/import/template', {
        responseType: 'blob',
      });
      return response.data;
    },

    export: async (params?: { search?: string; tags?: string; status?: string }) => {
      const response = await api.get('/contacts/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    },

    /**
     * HRMS — external HR-system sync. Same field schema as the Excel
     * template, kept in sync on the backend at hrmsSyncService.HRMS_FIELDS.
     */
    hrms: {
      getConfig: async () => {
        const r = await api.get('/contacts/hrms/config');
        return r.data;
      },
      saveConfig: async (data: {
        hrmsApiUrl?: string;
        hrmsApiAuthHeaderName?: string;
        hrmsApiAuthHeaderValue?: string;
        clearAuth?: boolean;
      }) => {
        const r = await api.put('/contacts/hrms/config', data);
        return r.data;
      },
      syncNow: async () => {
        // HRMS sync walks paginated employee data; can run several minutes
        // on large orgs. Override the axios default 30s timeout for just
        // this call so the browser doesn't bail out while the server is
        // still working through pages.
        const r = await api.post('/contacts/hrms/sync', undefined, {
          timeout: 500000,
        });
        return r.data;
      },
      downloadTemplate: async () => {
        const r = await api.get('/contacts/hrms/template.csv', { responseType: 'blob' });
        return r.data;
      },
    },
  },

  // Templates
  templates: {
    list: async (params?: { page?: number; limit?: number; channel?: string; status?: string }) => {
      const response = await api.get('/templates', { params });
      return response.data;
    },

    getById: async (id: string) => {
      const response = await api.get(`/templates/${id}`);
      return response.data;
    },

    create: async (data: any) => {
      const response = await api.post('/templates', data);
      return response.data;
    },

    update: async (id: string, data: any) => {
      const response = await api.put(`/templates/${id}`, data);
      return response.data;
    },

    submitForApproval: async (id: string) => {
      const response = await api.post(`/templates/${id}/submit`);
      return response.data;
    },

    syncFromMeta: async () => {
      const response = await api.post('/templates/sync-from-meta');
      return response.data;
    },

    approve: async (id: string) => {
      const response = await api.post(`/templates/${id}/approve`);
      return response.data;
    },

    reject: async (id: string, reason: string) => {
      const response = await api.post(`/templates/${id}/reject`, { reason });
      return response.data;
    },

    delete: async (id: string) => {
      const response = await api.delete(`/templates/${id}`);
      return response.data;
    },

    import: async (file: File, channel: string, options?: { skipDuplicates?: boolean; updateExisting?: boolean }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('channel', channel);
      if (options) {
        if (options.skipDuplicates !== undefined) {
          formData.append('skipDuplicates', String(options.skipDuplicates));
        }
        if (options.updateExisting !== undefined) {
          formData.append('updateExisting', String(options.updateExisting));
        }
      }
      const response = await api.post('/templates/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },

    downloadTemplate: async (channel: string) => {
      const response = await api.get('/templates/import/template', {
        params: { channel },
        responseType: 'blob',
      });
      return response.data;
    },

    export: async (params?: { channel?: string; status?: string; category?: string }) => {
      const response = await api.get('/templates/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    },
  },

  // Messages
  messages: {
    list: async (params?: { page?: number; limit?: number; status?: string; channel?: string; startDate?: string; endDate?: string }) => {
      const response = await api.get('/messages', { params });
      return response.data;
    },

    getById: async (id: string) => {
      const response = await api.get(`/messages/${id}`);
      return response.data;
    },

    send: async (data: any) => {
      const response = await api.post('/messages', data);
      return response.data;
    },

    sendBulk: async (data: any) => {
      const response = await api.post('/messages/bulk', data);
      return response.data;
    },

    listPendingApprovals: async (params?: { page?: number; limit?: number }) => {
      const response = await api.get('/messages/pending-approvals', { params });
      return response.data;
    },

    approve: async (id: string) => {
      const response = await api.post(`/messages/${id}/approve`);
      return response.data;
    },

    export: async (params?: { startDate?: string; endDate?: string; channel?: string; status?: string }) => {
      const response = await api.get('/messages/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    },

    reject: async (id: string, reason: string) => {
      const response = await api.post(`/messages/${id}/reject`, { reason });
      return response.data;
    },
    bulkApprove: async (messageIds?: string[]) => {
      const response = await api.post('/messages/bulk-approve', { messageIds });
      return response.data;
    },
  },

  // Campaigns (= bulk_message_batches, presented to operators as "Campaigns").
  // All endpoints are gated server-side by canViewReports.
  campaigns: {
    list: async (params?: { search?: string; channel?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) => {
      const r = await api.get('/campaigns', { params });
      return r.data;
    },
    getById: async (id: number | string) => {
      const r = await api.get(`/campaigns/${id}`);
      return r.data;
    },
    listMessages: async (id: number | string, params?: { status?: string; page?: number; limit?: number }) => {
      const r = await api.get(`/campaigns/${id}/messages`, { params });
      return r.data;
    },
    exportCsv: async (id: number | string) => {
      const r = await api.get(`/campaigns/${id}/export.csv`, { responseType: 'blob' });
      return r.data as Blob;
    },
  },

  // Dashboard/Reports
  dashboard: {
    getStats: async () => {
      const response = await api.get('/reports/dashboard');
      return response.data;
    },
    getActivity: async () => {
      const response = await api.get('/reports/dashboard/activity');
      return response.data;
    },
    getTemplateUsage: async () => {
      const response = await api.get('/reports/dashboard/template-usage');
      return response.data;
    },
    getFailureReasons: async () => {
      const response = await api.get('/reports/dashboard/failure-reasons');
      return response.data;
    },
    getRecentActivity: async () => {
      const response = await api.get('/reports/dashboard/recent-activity');
      return response.data;
    },
  },
  reports: {
    getMessageVolume: async (params?: { startDate?: string; endDate?: string }) => {
      const response = await api.get('/reports/message-volume', { params });
      return response.data;
    },
    getTemplatePerformance: async (params?: { startDate?: string; endDate?: string }) => {
      const response = await api.get('/reports/template-performance', { params });
      return response.data;
    },
    getDeliverySuccess: async (params?: { startDate?: string; endDate?: string }) => {
      const response = await api.get('/reports/delivery-success', { params });
      return response.data;
    },
    getCostAnalysis: async (params?: { startDate?: string; endDate?: string }) => {
      const response = await api.get('/reports/cost-analysis', { params });
      return response.data;
    },
    getUserActivity: async (params?: { startDate?: string; endDate?: string }) => {
      const response = await api.get('/reports/user-activity', { params });
      return response.data;
    },
    getChannelComparison: async (params?: { startDate?: string; endDate?: string }) => {
      const response = await api.get('/reports/channel-comparison', { params });
      return response.data;
    },
    getAllMessages: async (params?: { startDate?: string; endDate?: string }) => {
      const response = await api.get('/reports/all-messages', { params });
      return response.data;
    },
    exportReport: async (reportType: string, startDate?: string, endDate?: string) => {
      const response = await api.get('/reports/export', {
        params: { reportType, startDate, endDate },
        responseType: 'blob',
      });
      return response.data;
    },
  },

  // API Keys
  apiKeys: {
    list: async () => {
      const response = await api.get('/api-keys');
      return response.data;
    },

    create: async (data: any) => {
      const response = await api.post('/api-keys', data);
      return response.data;
    },

    revoke: async (id: string, reason?: string) => {
      const response = await api.post(`/api-keys/${id}/revoke`, { reason });
      return response.data;
    },
  },

  // Settings
  settings: {
    getOrganization: async () => {
      const response = await api.get('/settings/organization');
      return response.data;
    },

    updateOrganization: async (data: any) => {
      const response = await api.put('/settings/organization', data);
      return response.data;
    },
    getAvailableSmsProviders: async () => {
      const response = await api.get('/settings/sms-providers');
      return response.data;
    },
    getDecryptedSmsApiKey: async () => {
      const response = await api.get('/settings/sms-api-key');
      return response.data;
    },
    getCustomSmsApiKey: async () => {
      const response = await api.get('/settings/custom-sms-api-key');
      return response.data;
    },
    testWhatsAppConnection: async (credentials: any) => {
      const response = await api.post('/settings/test-whatsapp-connection', credentials);
      return response.data;
    },
    getSso: async () => {
      const response = await api.get('/settings/sso');
      return response.data;
    },
    updateSso: async (data: { ssoEnabled?: boolean; ssoDefaultRole?: string }) => {
      const response = await api.put('/settings/sso', data);
      return response.data;
    },
    rotateSsoSecret: async () => {
      const response = await api.post('/settings/sso/rotate');
      return response.data;
    },
  },
  emailConfigurations: {
    list: async () => {
      const response = await api.get('/email-configurations');
      return response.data;
    },
    getById: async (id: string) => {
      const response = await api.get(`/email-configurations/${id}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await api.post('/email-configurations', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await api.put(`/email-configurations/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/email-configurations/${id}`);
      return response.data;
    },
    getDefault: async () => {
      const response = await api.get('/email-configurations/default');
      return response.data;
    },
    getFallback: async () => {
      const response = await api.get('/email-configurations/fallback');
      return response.data;
    },
    test: async (id: string, testEmail: string) => {
      const response = await api.post(`/email-configurations/${id}/test`, { testEmail });
      return response.data;
    },
  },
  smsConfigurations: {
    list: async () => {
      const response = await api.get('/sms-configurations');
      return response.data;
    },
    getById: async (id: string) => {
      const response = await api.get(`/sms-configurations/${id}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await api.post('/sms-configurations', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await api.put(`/sms-configurations/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/sms-configurations/${id}`);
      return response.data;
    },
    getDefault: async () => {
      const response = await api.get('/sms-configurations/default');
      return response.data;
    },
    getFallback: async () => {
      const response = await api.get('/sms-configurations/fallback');
      return response.data;
    },
    getUser: async () => {
      const response = await api.get('/settings/user');
      return response.data;
    },

    updateUser: async (data: any) => {
      const response = await api.put('/settings/user', data);
      return response.data;
    },
  },
  users: {
    list: async (filters?: any) => {
      const response = await api.get('/users', { params: filters });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await api.get(`/users/${id}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await api.post('/users', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await api.put(`/users/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    },
    getStats: async () => {
      const response = await api.get('/users/stats');
      return response.data;
    },
    resendCredentials: async (id: string) => {
      const response = await api.post(`/users/${id}/resend-credentials`);
      return response.data;
    },
  },
  roles: {
    list: async () => {
      const response = await api.get('/roles');
      return response.data;
    },
    getByName: async (name: string) => {
      const response = await api.get(`/roles/${name}`);
      return response.data;
    },
    getUsersByRole: async (name: string) => {
      const response = await api.get(`/roles/${name}/users`);
      return response.data;
    },
    getStats: async () => {
      const response = await api.get('/roles/stats');
      return response.data;
    },
    updatePermissions: async (name: string, permissions: Record<string, boolean>) => {
      const r = await api.put(`/roles/${name}/permissions`, { permissions });
      return r.data;
    },
    resetPermissions: async (name: string) => {
      const r = await api.delete(`/roles/${name}/permissions`);
      return r.data;
    },
    // Phase 2 — custom role CRUD. Cap-enforced server-side via
    // Organization.featureFlags.maxCustomRoles.
    create: async (data: { name: string; description?: string | null; permissions: Record<string, boolean> }) => {
      const r = await api.post('/roles', data);
      return r.data;
    },
    getById: async (id: number | string) => {
      const r = await api.get(`/roles/id/${id}`);
      return r.data;
    },
    update: async (id: number | string, data: { name?: string; description?: string | null; permissions?: Record<string, boolean> }) => {
      const r = await api.put(`/roles/id/${id}`, data);
      return r.data;
    },
    delete: async (id: number | string) => {
      const r = await api.delete(`/roles/id/${id}`);
      return r.data;
    },
  },
  media: {
    list: async (params?: { page?: number; limit?: number; type?: string; search?: string }) => {
      const response = await api.get('/media', { params });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await api.get(`/media/${id}`);
      return response.data;
    },
    upload: async (
      file: File,
      onProgress?: (percent: number) => void,
    ) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (e: any) => {
          if (onProgress && e.total) {
            const percent = Math.round((e.loaded * 100) / e.total);
            onProgress(percent);
          }
        },
      });
      return response.data;
    },
    update: async (id: string, data: { name?: string; metadata?: any }) => {
      const response = await api.put(`/media/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/media/${id}`);
      return response.data;
    },
    getStats: async () => {
      const response = await api.get('/media/stats');
      return response.data;
    },
  },
  contactGroups: {
    list: async (params?: { page?: number; limit?: number; search?: string }) => {
      const response = await api.get('/contact-groups', { params });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await api.get(`/contact-groups/${id}`);
      return response.data;
    },
    getContacts: async (id: string, params?: { page?: number; limit?: number }) => {
      const response = await api.get(`/contact-groups/${id}/contacts`, { params });
      return response.data;
    },
    create: async (data: any) => {
      const response = await api.post('/contact-groups', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await api.put(`/contact-groups/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/contact-groups/${id}`);
      return response.data;
    },
    // Whitelist of fields a dynamic group may filter on. Frontend uses this
    // to build its picker without hard-coding the field names.
    filterFields: async () => {
      const r = await api.get('/contact-groups/filter-fields');
      return r.data;
    },
    // Distinct values that exist for one filter field in the caller's org.
    // E.g. all departments the org has seen → dropdown options.
    distinctValues: async (field: string) => {
      const r = await api.get(`/contact-groups/distinct/${encodeURIComponent(field)}`);
      return r.data;
    },
    // Evaluate a dynamic criteria without saving — returns count + sample.
    preview: async (filterConditions: any, sampleLimit = 10) => {
      const r = await api.post('/contact-groups/preview', { filterConditions, sampleLimit });
      return r.data;
    },
    addContacts: async (id: string, contactIds: string[]) => {
      const response = await api.post(`/contact-groups/${id}/contacts`, { contactIds });
      return response.data;
    },
    removeContacts: async (id: string, contactIds: string[]) => {
      const response = await api.delete(`/contact-groups/${id}/contacts`, { data: { contactIds } });
      return response.data;
    },
    // User assignments — controls which operators can see this group.
    listAssignedUsers: async (id: string) => {
      const r = await api.get(`/contact-groups/${id}/assigned-users`);
      return r.data;
    },
    setAssignedUsers: async (id: string, userIds: number[]) => {
      const r = await api.put(`/contact-groups/${id}/assigned-users`, { userIds });
      return r.data;
    },
    // Bulk-apply assignments across many groups × many users.
    // mode: 'add' inserts pairs; 'remove' deletes pairs; 'replace' sets each
    // group's assignees to exactly userIds.
    bulkAssign: async (
      groupIds: number[],
      userIds: number[],
      mode: 'add' | 'remove' | 'replace' = 'add'
    ) => {
      const r = await api.post('/contact-groups/assignments/bulk', { groupIds, userIds, mode });
      return r.data;
    },
    // Groups one operator is currently assigned to (for "Update Assigned" pre-check).
    listUserAssignedGroups: async (userId: number) => {
      const r = await api.get(`/contact-groups/assigned-to/${userId}`);
      return r.data;
    },
    // Replace an operator's entire assigned-group set.
    setUserAssignedGroups: async (userId: number, groupIds: number[]) => {
      const r = await api.put(`/contact-groups/assigned-to/${userId}`, { groupIds });
      return r.data;
    },
  },

  impersonate: async (userId: string) => {
    return api.post('/auth/impersonate', { userId });
  },
  getCurrentUser: async () => {
    return api.get('/auth/me');
  },

  chat: {
    listConversations: async (params?: { search?: string; page?: number; limit?: number }) => {
      const r = await api.get('/chat/conversations', { params });
      return r.data;
    },
    getThread: async (phone: string, params?: { before?: string; limit?: number }) => {
      const r = await api.get(`/chat/conversations/${encodeURIComponent(phone)}/messages`, { params });
      return r.data;
    },
    sendReply: async (
      phone: string,
      body: { text?: string; templateId?: number | string; variables?: Record<string, string> }
    ) => {
      const r = await api.post(`/chat/conversations/${encodeURIComponent(phone)}/messages`, body);
      return r.data;
    },
    markRead: async (phone: string) => {
      const r = await api.post(`/chat/conversations/${encodeURIComponent(phone)}/read`);
      return r.data;
    },
    webhookStatus: async () => {
      const r = await api.get('/chat/webhook-status');
      return r.data;
    },
  },

  webhooks: {
    recent: async (params?: { limit?: number }) => {
      const r = await api.get('/webhooks/recent', { params });
      return r.data;
    },
  },

  dashboard: {
    // Leadership dashboard — accepts all filters as query params.
    leadership: async (params?: {
      startDate?: string;
      endDate?: string;
      channel?: string;
      userId?: number;
      department?: string;
      region?: string;
      costCenter?: string;
      designation?: string;
    }) => {
      const r = await api.get('/dashboard/leadership', { params });
      return r.data;
    },
    leadershipFilters: async () => {
      const r = await api.get('/dashboard/leadership/filters');
      return r.data;
    },
  },
};

export default api;

