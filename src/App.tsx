import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RequirePermission } from './components/layout/RequirePermission';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './components/auth/Login';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ChangePassword } from './components/auth/ChangePassword';
import { SsoExchange } from './components/auth/SsoExchange';
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
import { TenantFeatures } from './components/admin/TenantFeatures';
import { UserManagement } from './components/tenant/UserManagement';
import { RoleManagement } from './components/tenant/RoleManagement';
import { ApprovalCenter } from './components/tenant/ApprovalCenter';
import { MISReports } from './components/tenant/MISReports';
import { LeadershipDashboard } from './components/tenant/LeadershipDashboard';
import { Campaigns } from './components/tenant/Campaigns';
import { CampaignDetail } from './components/tenant/CampaignDetail';
import { LiveChat } from './components/tenant/LiveChat';
import { ContactGroups } from './components/tenant/ContactGroups';

/**
 * Login route — renders the login screen + supporting modals.
 * On successful login, navigates to the original location the user was
 * trying to reach (via `state.from` from ProtectedRoute), or /home.
 */
function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh: refreshAuth } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // If already authenticated, jump straight to home
  if (localStorage.getItem('accessToken')) {
    return <Navigate to="/home" replace />;
  }

  const redirectTarget = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/home';

  const handleLogin = (_email: string, _password: string) => {
    const mustChangePassword = localStorage.getItem('mustChangePassword') === 'true';
    if (mustChangePassword) {
      setShowChangePassword(true);
      return;
    }
    // Refresh AuthContext with the newly-issued token so permissions/role gating
    // works immediately after navigation — otherwise the next page would see
    // a stale `user = null` and bounce to /login.
    refreshAuth().finally(() => navigate(redirectTarget, { replace: true }));
  };

  return (
    <>
      <Toaster position="top-right" />
      <Login onLogin={handleLogin} onForgotPassword={() => setShowForgotPassword(true)} />
      {showForgotPassword && <ForgotPassword onClose={() => setShowForgotPassword(false)} />}
      {showChangePassword && (
        <ChangePassword
          onClose={() => {
            setShowChangePassword(false);
            localStorage.removeItem('mustChangePassword');
          }}
          onPasswordChanged={() => {
            setShowChangePassword(false);
            navigate(redirectTarget, { replace: true });
          }}
          isFirstLogin
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/sso" element={<SsoExchange />} />

          {/* Authenticated area — ProtectedRoute gates, AppLayout provides chrome.
              Each leaf is wrapped in <RequirePermission> so a user typing a URL
              directly can't reach a page their role isn't entitled to. */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/home" replace />} />

              {/* Home is always available to any authenticated user. */}
              <Route path="/home" element={<HomeDashboard />} />

              <Route
                path="/send"
                element={
                  <RequirePermission anyOf={['canSendMessages']}>
                    <SendMessage />
                  </RequirePermission>
                }
              />

              {/* Templates: view requires canManageTemplates; new/edit are mutations. */}
              <Route path="/templates">
                <Route
                  index
                  element={
                    <RequirePermission anyOf={['canManageTemplates']}>
                      <Templates />
                    </RequirePermission>
                  }
                />
                <Route
                  path="new"
                  element={
                    <RequirePermission anyOf={['canManageTemplates']}>
                      <CreateTemplate />
                    </RequirePermission>
                  }
                />
                <Route
                  path=":id/edit"
                  element={
                    <RequirePermission anyOf={['canManageTemplates']}>
                      <CreateTemplate />
                    </RequirePermission>
                  }
                />
              </Route>

              <Route
                path="/chat"
                element={
                  <RequirePermission anyOf={['canViewLiveChat']}>
                    <LiveChat />
                  </RequirePermission>
                }
              />
              <Route
                path="/contacts"
                element={
                  <RequirePermission anyOf={['canManageContacts']}>
                    <Contacts />
                  </RequirePermission>
                }
              />
              <Route
                path="/contact-groups"
                element={
                  <RequirePermission anyOf={['canManageContacts']}>
                    <ContactGroups />
                  </RequirePermission>
                }
              />
              <Route
                path="/media"
                element={
                  <RequirePermission anyOf={['canManageTemplates', 'canSendMessages']}>
                    <MediaLibrary />
                  </RequirePermission>
                }
              />
              <Route
                path="/logs"
                element={
                  <RequirePermission anyOf={['canViewReports']}>
                    <MessageLogs />
                  </RequirePermission>
                }
              />
              <Route
                path="/approval"
                element={
                  <RequirePermission anyOf={['canApproveMessages']}>
                    <ApprovalCenter />
                  </RequirePermission>
                }
              />
              <Route
                path="/reports"
                element={
                  <RequirePermission anyOf={['canViewReports']}>
                    <MISReports />
                  </RequirePermission>
                }
              />
              <Route
                path="/campaigns"
                element={
                  <RequirePermission anyOf={['canViewReports']}>
                    <Campaigns />
                  </RequirePermission>
                }
              />
              <Route
                path="/campaigns/:id"
                element={
                  <RequirePermission anyOf={['canViewReports']}>
                    <CampaignDetail />
                  </RequirePermission>
                }
              />
              <Route
                path="/leadership"
                element={
                  <RequirePermission anyOf={['canViewLeadership']}>
                    <LeadershipDashboard />
                  </RequirePermission>
                }
              />
              <Route
                path="/users"
                element={
                  <RequirePermission anyOf={['canManageUsers']}>
                    <UserManagement />
                  </RequirePermission>
                }
              />
              <Route
                path="/roles"
                element={
                  <RequirePermission anyOf={['canAssignRoles', 'canManageUsers']}>
                    <RoleManagement />
                  </RequirePermission>
                }
              />
              <Route
                path="/webhooks"
                element={
                  <RequirePermission anyOf={['canManageSettings']}>
                    <WebhookEvents />
                  </RequirePermission>
                }
              />
              <Route
                path="/erp"
                element={
                  <RequirePermission anyOf={['canManageSettings']}>
                    <ERPIntegrations />
                  </RequirePermission>
                }
              />
              <Route
                path="/billing"
                element={
                  <RequirePermission anyOf={['canManageOrganization']}>
                    <BillingUsage />
                  </RequirePermission>
                }
              />
              <Route
                path="/organizations"
                element={
                  <RequirePermission role="super_admin">
                    <OrganizationManagement />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/tenant-features"
                element={
                  <RequirePermission role="super_admin">
                    <TenantFeatures />
                  </RequirePermission>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequirePermission anyOf={['canManageSettings']}>
                    <TenantSettings />
                  </RequirePermission>
                }
              />

              {/* Anything unknown inside the protected area falls back to /home */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Route>

          {/* Unknown public path → /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
