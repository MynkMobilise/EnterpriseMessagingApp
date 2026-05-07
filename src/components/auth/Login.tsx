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
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!@#');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  // Lock body/html scroll while login is mounted. The outer h-screen+overflow-hidden
  // on the React tree only prevents the React container from scrolling — the
  // document <body> can still scroll if anything inside spills over.
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setEmailError('');
    setPasswordError('');

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
      // Email-only login: backend resolves the org from the user record. The
      // optional organizationSlug field on the API is only needed when the
      // same email is registered with multiple organizations.
      const response = await apiService.auth.login({
        email: sanitizedEmail,
        password: password,
      });

      if (response.success && response.data) {
        // If a password change is required, prefer the explicit callback if the
        // parent provided one. If not, FALL THROUGH to onLogin — the api util
        // has already persisted `mustChangePassword: 'true'` in localStorage,
        // so the parent (LoginRoute) can detect it and trigger the modal.
        if (response.data.mustChangePassword && onPasswordChangeRequired) {
          onPasswordChangeRequired();
          return;
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

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ─── Left Side - Branding ────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #4338ca 50%, #7c3aed 100%)',
        }}
      >
        {/* Soft animated orbs — inline style for sizes/colors so we don't depend on
            arbitrary Tailwind values that the JIT may skip. */}
        <div
          className="absolute rounded-full blur-3xl animate-pulse"
          style={{ top: '-160px', left: '-160px', width: '380px', height: '380px', background: 'rgba(168, 85, 247, 0.35)' }}
        />
        <div
          className="absolute rounded-full blur-3xl animate-pulse"
          style={{ top: '30%', right: '-160px', width: '500px', height: '500px', background: 'rgba(96, 165, 250, 0.3)', animationDelay: '1s', animationDuration: '4s' }}
        />
        <div
          className="absolute rounded-full blur-3xl animate-pulse"
          style={{ bottom: '-160px', left: '25%', width: '420px', height: '420px', background: 'rgba(236, 72, 153, 0.25)', animationDelay: '2s', animationDuration: '5s' }}
        />

        {/* Subtle dot grid */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.07,
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-10 xl:p-16 text-white w-full">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}
            >
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Acme Corporation</h2>
              <p className="text-xs text-blue-200 font-semibold uppercase" style={{ letterSpacing: '0.15em' }}>
                WhatsApp Business Platform
              </p>
            </div>
          </div>

          {/* Hero */}
          <div className="space-y-5 max-w-xl mb-12">
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight" style={{ lineHeight: 1.05 }}>
              Enterprise Messaging
              <br />
              <span
                style={{
                  background: 'linear-gradient(90deg, #bfdbfe, #e9d5ff, #fbcfe8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Made Simple
              </span>
            </h1>
            <p className="text-lg text-blue-100 leading-relaxed max-w-lg">
              Connect with your customers at scale using our powerful WhatsApp Business API platform with multi-tenant capabilities.
            </p>
          </div>

          {/* Glassmorphism feature cards */}
          <div className="grid grid-cols-2 gap-3 mb-10 max-w-2xl">
            {[
              { icon: Shield, title: 'Enterprise Security', desc: 'Bank-grade encryption' },
              { icon: Zap, title: 'Real-time Delivery', desc: 'Instant at scale' },
              { icon: Users, title: 'Multi-Tenant', desc: 'Multiple organizations' },
              { icon: CheckCircle, title: '99.9% Uptime', desc: 'Reliable infrastructure' },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/15 transition-all hover:border-white/30"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/15"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{title}</div>
                  <div className="text-xs text-blue-200 truncate">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="pt-6 border-t border-white/20 max-w-xl">
            <div className="grid grid-cols-3 gap-6">
              {[
                { num: '1M+', label: 'Messages Sent' },
                { num: '500+', label: 'Organizations' },
                { num: '99.9%', label: 'Success Rate' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div className="text-3xl xl:text-4xl font-bold leading-none text-white">{num}</div>
                  <div
                    className="text-xs text-blue-200 mt-2 font-semibold uppercase"
                    style={{ letterSpacing: '0.12em' }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Side - Login Form ─────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-10 bg-white dark:bg-gray-950 relative overflow-hidden">
        {/* Decorative glows — inline style so we control opacity exactly */}
        <div
          className="absolute rounded-full blur-3xl pointer-events-none"
          style={{
            top: 0, right: 0, width: '420px', height: '420px',
            background: 'linear-gradient(135deg, rgba(219, 234, 254, 0.7), rgba(233, 213, 255, 0.7))',
            transform: 'translate(33%, -50%)',
          }}
        />
        <div
          className="absolute rounded-full blur-3xl pointer-events-none"
          style={{
            bottom: 0, left: 0, width: '320px', height: '320px',
            background: 'linear-gradient(45deg, rgba(252, 231, 243, 0.5), rgba(219, 234, 254, 0.5))',
            transform: 'translate(-33%, 50%)',
          }}
        />

        <div className="w-full max-w-md py-4 relative">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-3 shadow-xl shadow-blue-600/30">
              <Send className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Acme Corporation</h1>
            <p
              className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase mt-0.5"
              style={{ letterSpacing: '0.15em' }}
            >
              WhatsApp Business Platform
            </p>
          </div>

          {/* Login Header */}
          <div className="mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 mb-4">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Secure sign-in
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" ref={formRef}>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 tracking-wide uppercase">
                Email Address <span className="text-red-500 normal-case">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="you@company.com"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-sm transition-all"
                disabled={isLoading}
              />
              {emailError && <p className="text-xs text-red-500 mt-1.5">{emailError}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 tracking-wide uppercase">
                Password <span className="text-red-500 normal-case">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white text-sm transition-all pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              {passwordError && <p className="text-xs text-red-500 mt-1.5">{passwordError}</p>}
            </div>

            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full px-6 py-3.5 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)',
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3), 0 8px 10px -6px rgba(124, 58, 237, 0.2)',
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Rate Limit Reset (Development Only) */}
          {isDevelopment && showRateLimitReset && (
            <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-orange-900 dark:text-orange-200 mb-1">
                    <strong>Rate Limit Exceeded</strong>
                  </p>
                  <p className="text-xs text-orange-800 dark:text-orange-300 mb-2">
                    Too many login attempts. Reset the rate limit to continue testing.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetRateLimits}
                    disabled={isResettingRateLimit}
                    className="w-full px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {isResettingRateLimit ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Reset Rate Limit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-7 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Need help? Contact{' '}
              <a href="#" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                support@acme-corp.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}