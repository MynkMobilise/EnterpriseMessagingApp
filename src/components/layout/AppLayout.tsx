import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiService } from '../../utils/api';
import { OrganizationSwitcher } from '../OrganizationSwitcher';
import { OrganizationProvider } from '../../contexts/OrganizationContext';
import { useAuth, PermissionKey, Role } from '../../contexts/AuthContext';
import { ImpersonateUser } from '../ImpersonateUser';
import { ChangePassword } from '../auth/ChangePassword';
import { Toaster, toast } from 'sonner';
import {
  Home, Send, FileText, Image, Activity, Webhook, Blocks, CreditCard,
  Settings, Building2, Bell, Moon, Sun, ChevronDown, ChevronLeft, ChevronRight,
  Menu, X, LogOut, Lock, User, Users, CheckCircle, BarChart3, Shield,
  MessageCircle, UsersRound, LineChart,
} from 'lucide-react';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'ops' | 'admin';
  /** Show the item if the user has ANY of these permissions. Empty/undefined = always shown. */
  anyOf?: PermissionKey[];
  /** Restrict the item to one or more roles (in addition to anyOf). */
  role?: Role | Role[];
};

// Permission gating must match the route guards in App.tsx — if these drift,
// users will see menu items that 403 on click.
const NAV: NavItem[] = [
  { to: '/home', label: 'Home Dashboard', icon: Home, section: 'ops' },
  { to: '/chat', label: 'Live Chat', icon: MessageCircle, section: 'ops', anyOf: ['canViewLiveChat'] },
  { to: '/send', label: 'Send Message', icon: Send, section: 'ops', anyOf: ['canSendMessages'] },
  { to: '/templates', label: 'Templates', icon: FileText, section: 'ops', anyOf: ['canManageTemplates'] },
  { to: '/contacts', label: 'Contacts', icon: Users, section: 'ops', anyOf: ['canManageContacts'] },
  { to: '/contact-groups', label: 'Contact Groups', icon: UsersRound, section: 'ops', anyOf: ['canManageContacts'] },
  { to: '/media', label: 'Media Library', icon: Image, section: 'ops', anyOf: ['canManageTemplates', 'canSendMessages'] },
  { to: '/logs', label: 'Message Logs', icon: Activity, section: 'ops', anyOf: ['canViewReports'] },
  { to: '/approval', label: 'Approval Center', icon: CheckCircle, section: 'ops', anyOf: ['canApproveMessages'] },
  { to: '/reports', label: 'MIS Reports', icon: BarChart3, section: 'ops', anyOf: ['canViewReports'] },
  { to: '/leadership', label: 'Leadership', icon: LineChart, section: 'ops', anyOf: ['canViewLeadership'] },
  { to: '/users', label: 'User Management', icon: User, section: 'admin', anyOf: ['canManageUsers'] },
  { to: '/roles', label: 'Role Management', icon: Shield, section: 'admin', anyOf: ['canAssignRoles', 'canManageUsers'] },
  { to: '/webhooks', label: 'Webhook Events', icon: Webhook, section: 'admin', anyOf: ['canManageSettings'] },
  { to: '/erp', label: 'Integrations', icon: Blocks, section: 'admin', anyOf: ['canManageSettings'] },
  { to: '/billing', label: 'Billing & Usage', icon: CreditCard, section: 'admin', anyOf: ['canManageOrganization'] },
  { to: '/organizations', label: 'Organizations', icon: Building2, section: 'admin', role: 'super_admin' },
  { to: '/settings', label: 'Settings', icon: Settings, section: 'admin', anyOf: ['canManageSettings'] },
];

export function AppLayout() {
  const navigate = useNavigate();
  const { user, hasPermission, hasRole, refresh: refreshAuth } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const userEmail = user?.email || '';
  const orgName = user?.organization?.name || '';
  const orgPlan = user?.organization?.plan || '';
  const isSuperAdmin = user?.role === 'super_admin';

  // Filter NAV by permission/role. super_admin is bypassed inside hasPermission,
  // so they see everything. Anything without an `anyOf` or `role` is always shown.
  const isNavItemVisible = (item: NavItem) => {
    if (item.role) {
      const roles = Array.isArray(item.role) ? item.role : [item.role];
      if (!hasRole(...roles)) return false;
    }
    if (item.anyOf && item.anyOf.length > 0) {
      return item.anyOf.some((p) => hasPermission(p));
    }
    return true;
  };
  const visibleNav = NAV.filter(isNavItemVisible);

  const isDark = theme === 'dark';

  const handleLogout = async () => {
    try {
      await apiService.auth.logout();
    } catch {
      // Continue logout even if API call fails
    }
    localStorage.removeItem('accessToken');
    // Clear AuthContext so a re-login as a different user doesn't briefly
    // see the previous user's permissions before /auth/me returns.
    refreshAuth().catch(() => {});
    setShowProfileDropdown(false);
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
        : isDark
        ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <OrganizationProvider>
      <div className={`min-h-screen ${isDark ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
        <Toaster position="top-right" theme={theme} />

        {/* Top Navigation */}
        <header className={`h-16 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-b fixed top-0 left-0 right-0 z-30`}>
          <div className="h-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={sidebarOpen}
                aria-controls="sidebar-navigation"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                )}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {orgName || 'Loading…'}
                  </h1>
                  <p className="text-xs text-gray-500">
                    {orgPlan ? `${orgPlan.charAt(0).toUpperCase()}${orgPlan.slice(1)} Plan` : 'WhatsApp Business'}
                  </p>
                </div>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden lg:flex p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ml-2"
                  aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                  title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                  {sidebarOpen ? (
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ImpersonateUser
                onImpersonate={() => {
                  // After impersonation, the new accessToken belongs to the
                  // target user — refresh AuthContext so menu/permissions
                  // re-evaluate against the impersonated identity.
                  refreshAuth().catch(() => {});
                }}
              />

              {/* Org switching is a super-admin/platform-owner feature.
                  Tenant admins only ever see their own org so the switcher
                  would be confusing — and security-wise it would call the
                  list-orgs endpoint they can't really act on anyway. */}
              {isSuperAdmin && (
                <OrganizationSwitcher
                  onManageOrganizations={() => navigate('/organizations')}
                  onCreateOrganization={() => navigate('/organizations')}
                />
              )}

              <button
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors relative`}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-label="You have new notifications"></span>
              </button>

              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-5 h-5 text-gray-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}
                  aria-label="User menu"
                  aria-expanded={showProfileDropdown}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white" aria-hidden="true">{userEmail.charAt(0).toUpperCase()}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" aria-hidden="true" />
                </button>

                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)}></div>
                    <div className={`absolute right-0 mt-2 w-64 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl z-50 overflow-hidden`}>
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-900 dark:text-white mb-1">Signed in as</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{userEmail}</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => { setShowProfileDropdown(false); navigate('/settings'); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors text-left`}
                        >
                          <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Profile Settings</span>
                        </button>
                        <button
                          onClick={() => { setShowProfileDropdown(false); setShowChangePassword(true); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors text-left`}
                        >
                          <Lock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Change Password</span>
                        </button>
                      </div>
                      <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm text-red-600 dark:text-red-400">Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Sidebar */}
        <aside
          id="sidebar-navigation"
          className={`fixed top-16 left-0 bottom-0 w-64 ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
          } border-r transition-transform duration-300 z-20 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="p-4 space-y-6 overflow-y-auto h-full">
            <div className="space-y-1">
              <div className="px-3 py-2">
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Operations</p>
              </div>
              {visibleNav.filter((n) => n.section === 'ops').map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={closeSidebarOnMobile}
                    className={navLinkClass}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {visibleNav.some((n) => n.section === 'admin') && (
              <>
                <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}></div>

                <div className="space-y-1">
                  <div className="px-3 py-2">
                    <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Administration</p>
                  </div>
                  {visibleNav.filter((n) => n.section === 'admin').map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={closeSidebarOnMobile}
                        className={navLinkClass}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </>
            )}
          </nav>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 lg:hidden top-16"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content — child routes render here */}
        <main className={`pt-16 min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
          <Outlet />
        </main>

        {showChangePassword && (
          <ChangePassword onClose={() => setShowChangePassword(false)} />
        )}
      </div>
    </OrganizationProvider>
  );
}
