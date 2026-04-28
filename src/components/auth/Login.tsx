import React, { useState, useEffect, useRef } from 'react';
import { Send, Eye, EyeOff, ArrowRight, Shield, Zap, Users, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { validateEmail, checkRateLimit, sanitizeInput } from '../../utils/security';
import { trapFocus, announceToScreenReader } from '../../utils/accessibility';
import { apiService } from '../../utils/api';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  onForgotPassword: () => void;
  onPasswordChangeRequired?: () => void;
}

export function Login({ onLogin, onForgotPassword, onPasswordChangeRequired }: LoginProps) {
  const [organizationSlug, setOrganizationSlug] = useState('default-org');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!@#');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [organizationSlugError, setOrganizationSlugError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showRateLimitReset, setShowRateLimitReset] = useState(false);
  const [isResettingRateLimit, setIsResettingRateLimit] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Check if we're in development mode
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Focus trap for accessibility
  useEffect(() => {
    if (formRef.current) {
      const cleanup = trapFocus(formRef.current);
      return cleanup;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setOrganizationSlugError('');
    setEmailError('');
    setPasswordError('');

    // Validate organization slug
    const sanitizedOrgSlug = sanitizeInput(organizationSlug, 100);
    if (!sanitizedOrgSlug) {
      setOrganizationSlugError('Organization slug is required');
      announceToScreenReader('Organization slug is required', 'assertive');
      return;
    }

    // Validate email
    const sanitizedEmail = sanitizeInput(email, 254);
    if (!sanitizedEmail) {
      setEmailError('Email is required');
      announceToScreenReader('Email is required', 'assertive');
      return;
    }
    
    if (!validateEmail(sanitizedEmail)) {
      setEmailError('Please enter a valid email address');
      announceToScreenReader('Invalid email address', 'assertive');
      return;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      announceToScreenReader('Password is required', 'assertive');
      return;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      announceToScreenReader('Password too short', 'assertive');
      return;
    }

    // Rate limiting (max 5 attempts per minute)
    const rateLimitCheck = checkRateLimit(`login-${sanitizedEmail}`, 5, 60000);
    if (!rateLimitCheck.allowed) {
      const remainingTime = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000);
      toast.error('Too many login attempts', {
        description: `Please try again in ${remainingTime} seconds`,
      });
      announceToScreenReader(`Too many login attempts. Try again in ${remainingTime} seconds`, 'assertive');
      return;
    }

    setIsLoading(true);
    
    try {
      // Call real backend API
      const response = await apiService.auth.login({
        email: sanitizedEmail,
        password: password,
        organizationSlug: sanitizedOrgSlug,
      });

      if (response.success && response.data) {
        // Check if password change is required
        if (response.data.mustChangePassword) {
          // Trigger password change modal
          if (onPasswordChangeRequired) {
            onPasswordChangeRequired();
          }
          return; // Don't authenticate yet
        }
        onLogin(sanitizedEmail, password);
        toast.success('Welcome back!', {
          description: 'Successfully logged in to your account',
        });
        announceToScreenReader('Successfully logged in', 'polite');
      } else {
        toast.error('Invalid credentials', {
          description: response.error?.message || 'Please check your email and password',
        });
        announceToScreenReader('Invalid credentials', 'assertive');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Login failed. Please try again.';
      const statusCode = error.response?.status;
      
      // Show rate limit reset option if 429 error in development
      if (statusCode === 429 && isDevelopment) {
        setShowRateLimitReset(true);
      }
      
      toast.error('Login failed', {
        description: errorMessage,
      });
      announceToScreenReader('Login failed', 'assertive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRateLimits = async () => {
    if (!isDevelopment) return;
    
    setIsResettingRateLimit(true);
    try {
      const response = await apiService.auth.resetRateLimits();
      if (response.success) {
        toast.success('Rate limits reset', {
          description: 'You can now try logging in again',
        });
        setShowRateLimitReset(false);
        announceToScreenReader('Rate limits have been reset', 'polite');
      } else {
        throw new Error(response.error?.message || 'Failed to reset rate limits');
      }
    } catch (error: any) {
      toast.error('Failed to reset rate limits', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setIsResettingRateLimit(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };

  const handleOrganizationSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrganizationSlug(e.target.value);
    if (organizationSlugError) setOrganizationSlugError('');
  };

  return (
    <div className="min-h-screen flex dark:bg-gray-950">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Logo & Title */}
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl">Acme Corporation</h2>
                <p className="text-sm text-blue-100">WhatsApp Business Platform</p>
              </div>
            </div>

            <div className="space-y-6 max-w-xl">
              <h1 className="text-5xl xl:text-6xl leading-tight">
                Enterprise Messaging
                <br />
                <span className="text-blue-200">Made Simple</span>
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                Connect with your customers at scale using our powerful WhatsApp Business API platform with multi-tenant capabilities.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-lg flex items-center justify-center flex-shrink-0 border border-white/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm mb-1">Enterprise Security</h3>
                  <p className="text-sm text-blue-100">Bank-grade encryption and compliance</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-lg flex items-center justify-center flex-shrink-0 border border-white/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm mb-1">Real-time Delivery</h3>
                  <p className="text-sm text-blue-100">Instant message delivery at scale</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-lg flex items-center justify-center flex-shrink-0 border border-white/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm mb-1">Multi-Tenant</h3>
                  <p className="text-sm text-blue-100">Manage multiple organizations</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-lg flex items-center justify-center flex-shrink-0 border border-white/20">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm mb-1">99.9% Uptime</h3>
                  <p className="text-sm text-blue-100">Reliable infrastructure</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-6 border-t border-white/20">
              <div>
                <div className="text-3xl mb-1">1M+</div>
                <div className="text-sm text-blue-100">Messages Sent</div>
              </div>
              <div>
                <div className="text-3xl mb-1">500+</div>
                <div className="text-sm text-blue-100">Organizations</div>
              </div>
              <div>
                <div className="text-3xl mb-1">99.9%</div>
                <div className="text-sm text-blue-100">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl mb-4 shadow-lg shadow-blue-600/20">
              <Send className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl text-gray-900 dark:text-white mb-2">Acme Corporation</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              WhatsApp Business Platform
            </p>
          </div>

          {/* Login Header */}
          <div className="mb-8">
            <h2 className="text-3xl text-gray-900 dark:text-white mb-2">Welcome Back</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6" ref={formRef}>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Organization Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={organizationSlug}
                onChange={handleOrganizationSlugChange}
                placeholder="e.g., default-org"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
                disabled={isLoading}
              />
              {organizationSlugError && <p className="text-sm text-red-500 mt-1">{organizationSlugError}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="you@company.com"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
                disabled={isLoading}
              />
              {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
              {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Remember me</span>
              </label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Rate Limit Reset (Development Only) */}
          {isDevelopment && showRateLimitReset && (
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-orange-900 dark:text-orange-200 mb-2">
                    <strong>Rate Limit Exceeded</strong>
                  </p>
                  <p className="text-xs text-orange-800 dark:text-orange-300 mb-3">
                    Too many login attempts. Reset the rate limit to continue testing.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetRateLimits}
                    disabled={isResettingRateLimit}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isResettingRateLimit ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Reset Rate Limit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-8">
            Need help? Contact{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              support@acme-corp.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}