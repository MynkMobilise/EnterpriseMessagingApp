import { useState, useEffect } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { apiService } from '../utils/api';
import { toast } from 'sonner';

interface UserOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

interface ImpersonateUserProps {
  onImpersonate?: () => void;
}

export function ImpersonateUser({ onImpersonate }: ImpersonateUserProps) {
  // Get user info from localStorage or API
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await apiService.auth.getCurrentUser();
        if (response.success && response.data) {
          setCurrentUser(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Get all organizations first
      const orgsResponse = await apiService.organizations.list();
      if (!orgsResponse.success) {
        return;
      }

      const organizations = orgsResponse.data || [];
      const allUsers: UserOption[] = [];

      // Get users from each organization
      for (const org of organizations) {
        try {
          const usersResponse = await apiService.users.list({ organizationId: org.id });
          if (usersResponse.success && usersResponse.data) {
            const orgUsers = (usersResponse.data.users || usersResponse.data || []).map((u: any) => ({
              id: u.id,
              email: u.email,
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              organizationId: org.id,
              organizationName: org.name,
              role: u.role,
            }));
            allUsers.push(...orgUsers);
          }
        } catch (error) {
          console.error(`Failed to fetch users for ${org.name}:`, error);
        }
      }

      // Filter out SuperAdmin and current user
      const filteredUsers = allUsers.filter(
        (u) => u.role !== 'super_admin' && u.id !== currentUser?.id
      );

      setUsers(filteredUsers);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users when currentUser is available and is SuperAdmin
  useEffect(() => {
    if (currentUser?.role === 'super_admin') {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleImpersonate = async (targetUserId: string) => {
    try {
      const response = await apiService.auth.impersonate(targetUserId);
      if (response.success && response.data) {
        // Store tokens
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('organizationId', response.data.user.organizationId);
        localStorage.setItem('currentOrganizationId', response.data.user.organizationId);

        toast.success(`Logged in as ${response.data.user.email}`, {
          description: `Organization: ${response.data.user.organization?.name || 'N/A'}`,
        });

        setIsOpen(false);
        
        // Update current user state
        setCurrentUser(response.data.user);
        
        onImpersonate?.();

        // Reload page to refresh all contexts
        window.location.reload();
      } else {
        throw new Error(response.error?.message || 'Failed to impersonate user');
      }
    } catch (error: any) {
      console.error('Impersonation failed:', error);
      toast.error('Failed to login as user', {
        description: error.response?.data?.error?.message || error.message,
      });
    }
  };

  const handleStopImpersonating = async () => {
    // Clear impersonation and logout
    try {
      await apiService.auth.logout();
    } catch (error) {
      // Continue even if logout fails
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('currentOrganizationId');
    window.location.href = '/login';
  };

  // Check if currently impersonating
  const isImpersonating = currentUser?.isImpersonated === true;

  // Only show for SuperAdmin - MUST be after all hooks
  if (currentUser?.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="relative">
      {isImpersonating ? (
        <button
          onClick={handleStopImpersonating}
          className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
          title="Stop impersonating and return to SuperAdmin"
        >
          <LogOut className="w-4 h-4" />
          <span>Stop Impersonating</span>
        </button>
      ) : (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Login as another user (SuperAdmin only)"
          >
            <User className="w-4 h-4" />
            <span>Login as User</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Login as User
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Select a user to impersonate
                  </p>
                </div>

                {loading ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No users available
                  </div>
                ) : (
                  <div className="py-2">
                    {users.map((userOption) => (
                      <button
                        key={userOption.id}
                        onClick={() => handleImpersonate(userOption.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {userOption.firstName} {userOption.lastName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {userOption.email}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {userOption.organizationName}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                            {userOption.role}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
