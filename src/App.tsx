import { useState, useEffect } from 'react';
import { apiService } from './utils/api';
import { HomeDashboard } from './components/tenant/HomeDashboard';
import { SendMessage } from './components/tenant/send-message/SendMessage';
import { Templates } from './components/tenant/Templates';
import { CreateTemplate } from './components/tenant/CreateTemplate';
import { Contacts } from './components/tenant/Contacts';
import { MediaLibrary } from './components/tenant/MediaLibrary';
import { MessageLogs } from './components/tenant/MessageLogs';
import { WebhookEvents } from './components/tenant/WebhookEvents';
import { ERPIntegrations } from './components/tenant/ERPIntegrations';
import { BillingUsage } from './components/tenant/BillingUsage';
import { TenantSettings } from './components/tenant/TenantSettings';
import { OrganizationManagement } from './components/tenant/OrganizationManagement';
import { UserManagement } from './components/tenant/UserManagement';
import { RoleManagement } from './components/tenant/RoleManagement';
import { ApprovalCenter } from './components/tenant/ApprovalCenter';
import { MISReports } from './components/tenant/MISReports';
import { Login } from './components/auth/Login';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ChangePassword } from './components/auth/ChangePassword';
import { OrganizationSwitcher } from './components/OrganizationSwitcher';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ImpersonateUser } from './components/ImpersonateUser';
import { 
  Home, 
  Send, 
  FileText, 
  Image, 
  Activity, 
  Webhook, 
  Blocks, 
  CreditCard, 
  Settings,
  Building2,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Lock,
  User,
  Users,
  CheckCircle,
  BarChart3,
  Shield
} from 'lucide-react';
import { Toaster, toast } from 'sonner@2.0.3';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [activeModule, setActiveModule] = useState('home');
  const [editingTemplateId, setEditingTemplateId] = useState<string | number | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showOrgManagement, setShowOrgManagement] = useState(false);

  const navigation = [
    { id: 'home', label: 'Home Dashboard', icon: Home },
    { id: 'send', label: 'Send Message', icon: Send },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'media', label: 'Media Library', icon: Image },
    { id: 'logs', label: 'Message Logs', icon: Activity },
    { id: 'webhooks', label: 'Webhook Events', icon: Webhook },
    { id: 'erp', label: 'ERP Integrations', icon: Blocks },
    { id: 'billing', label: 'Billing & Usage', icon: CreditCard },
    { id: 'organizations', label: 'Organizations', icon: Building2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleLogin = (email: string, password: string) => {
    // Check if password change is required
    const mustChangePassword = localStorage.getItem('mustChangePassword') === 'true';
    if (mustChangePassword) {
      setShowChangePassword(true);
      setUserEmail(email);
      return; // Don't authenticate yet
    }
    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const handleLogout = async () => {
    try {
      await apiService.auth.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    }
    setIsAuthenticated(false);
    setUserEmail('');
    setActiveModule('home');
    setShowProfileDropdown(false);
    toast.success('Logged out successfully');
  };

  const renderContent = () => {
    switch (activeModule) {
      case 'home':
        return <HomeDashboard />;
      case 'send':
        return <SendMessage />;
      case 'templates':
        return <Templates 
          onNavigateToCreate={() => {
            setEditingTemplateId(null);
            setActiveModule('create-template');
          }}
          onNavigateToEdit={(templateId) => {
            setEditingTemplateId(templateId);
            setActiveModule('create-template');
          }}
        />;
      case 'create-template':
        return <CreateTemplate 
          templateId={editingTemplateId || undefined}
          onClose={() => {
            setEditingTemplateId(null);
            setActiveModule('templates');
          }} 
        />;
      case 'contacts':
        return <Contacts />;
      case 'media':
        return <MediaLibrary />;
      case 'logs':
        return <MessageLogs />;
      case 'webhooks':
        return <WebhookEvents />;
      case 'erp':
        return <ERPIntegrations />;
      case 'billing':
        return <BillingUsage />;
      case 'organizations':
        return <OrganizationManagement />;
      case 'settings':
        return <TenantSettings />;
      case 'approval':
        return <ApprovalCenter />;
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'reports':
        return <MISReports />;
      default:
        return <HomeDashboard />;
    }
  };

  const isDark = theme === 'dark';


  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <div className={isDark ? 'dark' : ''}>
          <Toaster position="top-right" theme={theme} />
          <Login 
            onLogin={handleLogin}
            onForgotPassword={() => setShowForgotPassword(true)}
          />
          {showForgotPassword && (
            <ForgotPassword onClose={() => setShowForgotPassword(false)} />
          )}
          {showChangePassword && (
            <ChangePassword 
              onClose={() => {
                setShowChangePassword(false);
                // Clear mustChangePassword flag if user cancels
                localStorage.removeItem('mustChangePassword');
              }}
              onPasswordChanged={() => {
                // Password changed successfully, now authenticate
                setShowChangePassword(false);
                setIsAuthenticated(true);
              }}
              isFirstLogin={true}
            />
          )}
        </div>
      </>
    );
  }

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
                  <h1 className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Acme Corporation</h1>
                  <p className="text-xs text-gray-500">WhatsApp Business</p>
                </div>
                {/* Sidebar Collapse Button */}
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
              {/* Impersonate User (SuperAdmin only) */}
              <ImpersonateUser 
                onImpersonate={() => {
                  // Refresh user info after impersonation
                  const token = localStorage.getItem('accessToken');
                  if (token) {
                    apiService.auth.getCurrentUser().then((response) => {
                      if (response.success && response.data) {
                        setUserEmail(response.data.email || '');
                        setUserRole(response.data.role || '');
                      }
                    }).catch(() => {});
                  }
                }}
              />

              {/* Organization Switcher */}
              <OrganizationSwitcher 
                onManageOrganizations={() => setActiveModule('organizations')}
                onCreateOrganization={() => setActiveModule('organizations')}
              />

              {/* Notifications */}
              <button 
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors relative`}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-label="You have new notifications"></span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-gray-400" aria-hidden="true" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" aria-hidden="true" />
                )}
              </button>

              {/* Profile Dropdown */}
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

                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileDropdown(false)}
                    ></div>
                    <div className={`absolute right-0 mt-2 w-64 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl z-50 overflow-hidden`}>
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-900 dark:text-white mb-1">Signed in as</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{userEmail}</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            setActiveModule('settings');
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors text-left`}
                        >
                          <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Profile Settings</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            setShowChangePassword(true);
                          }}
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
          className={`fixed top-16 left-0 bottom-0 w-64 ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
          } border-r transition-transform duration-300 z-20 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="p-4 space-y-6 overflow-y-auto h-full">
            {/* Operations Section */}
            <div className="space-y-1">
              <div className="px-3 py-2">
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Operations
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveModule('home');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'home'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Home Dashboard</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('send');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'send'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Send className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Send Message</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('templates');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'templates' || activeModule === 'create-template'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Templates</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('contacts');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'contacts'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Contacts</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('media');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'media'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Image className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Media Library</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('logs');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'logs'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Activity className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Message Logs</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('approval');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'approval'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Approval Center</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('reports');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'reports'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">MIS Reports</span>
              </button>
            </div>

            {/* Separator */}
            <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}></div>

            {/* Administration Section */}
            <div className="space-y-1">
              <div className="px-3 py-2">
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Administration
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveModule('users');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'users'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <User className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">User Management</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('roles');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'roles'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Role Management</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('webhooks');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'webhooks'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Webhook className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Webhook Events</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('erp');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'erp'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Blocks className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Integrations</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('billing');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'billing'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Billing & Usage</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('organizations');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'organizations'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Organizations</span>
              </button>
              <button
                onClick={() => {
                  setActiveModule('settings');
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  activeModule === 'settings'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Settings</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 lg:hidden top-16"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <main className={`pt-16 min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}>
          {renderContent()}
        </main>

        {/* Modals */}
        {showChangePassword && (
          <ChangePassword onClose={() => setShowChangePassword(false)} />
        )}
      </div>
    </OrganizationProvider>
  );
}