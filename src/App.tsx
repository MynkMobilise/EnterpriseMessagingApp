import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
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
import { UserManagement } from './components/tenant/UserManagement';
import { RoleManagement } from './components/tenant/RoleManagement';
import { ApprovalCenter } from './components/tenant/ApprovalCenter';
import { MISReports } from './components/tenant/MISReports';
import { LiveChat } from './components/tenant/LiveChat';

/**
 * Login route — renders the login screen + supporting modals.
 * On successful login, navigates to the original location the user was
 * trying to reach (via `state.from` from ProtectedRoute), or /home.
 */
function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
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
    navigate(redirectTarget, { replace: true });
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
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/sso" element={<SsoExchange />} />

        {/* Authenticated area — ProtectedRoute gates, AppLayout provides chrome */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeDashboard />} />
            <Route path="/send" element={<SendMessage />} />

            {/* Templates is a parent group with /new and /:id/edit children */}
            <Route path="/templates">
              <Route index element={<Templates />} />
              <Route path="new" element={<CreateTemplate />} />
              <Route path=":id/edit" element={<CreateTemplate />} />
            </Route>

            <Route path="/chat" element={<LiveChat />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/media" element={<MediaLibrary />} />
            <Route path="/logs" element={<MessageLogs />} />
            <Route path="/approval" element={<ApprovalCenter />} />
            <Route path="/reports" element={<MISReports />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/roles" element={<RoleManagement />} />
            <Route path="/webhooks" element={<WebhookEvents />} />
            <Route path="/erp" element={<ERPIntegrations />} />
            <Route path="/billing" element={<BillingUsage />} />
            <Route path="/organizations" element={<OrganizationManagement />} />
            <Route path="/settings" element={<TenantSettings />} />

            {/* Anything unknown inside the protected area falls back to /home */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Route>

        {/* Unknown public path → /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
