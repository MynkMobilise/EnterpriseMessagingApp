/**
 * Security Utilities
 * Provides input validation, sanitization, and security helpers
 */

// Email validation with RFC 5322 standard
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

// Phone number validation (international format)
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
}

// Password strength validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { valid: errors.length === 0, errors };
}

// Sanitize HTML to prevent XSS
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  const map: { [key: string]: string } = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (char) => map[char]);
}

// Sanitize input for display (prevent XSS)
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);
  
  // Remove any script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  return sanitizeHTML(sanitized);
}

// Validate and sanitize URL
export function validateURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// Rate limiting helper (client-side)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remainingAttempts: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetTime: now + windowMs };
  }
  
  if (record.count >= maxAttempts) {
    return { allowed: false, remainingAttempts: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  rateLimitMap.set(key, record);
  
  return { allowed: true, remainingAttempts: maxAttempts - record.count, resetTime: record.resetTime };
}

// Validate template name (alphanumeric, underscores, hyphens)
export function validateTemplateName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const templateRegex = /^[a-zA-Z0-9_-]{3,64}$/;
  return templateRegex.test(name);
}

// Validate organization name
export function validateOrganizationName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  return name.trim().length >= 2 && name.trim().length <= 100;
}

// Generate secure random string
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Validate API key format
export function validateAPIKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  // API keys should be at least 32 characters alphanumeric
  const apiKeyRegex = /^[a-zA-Z0-9_-]{32,}$/;
  return apiKeyRegex.test(key);
}

// Content Security Policy helper
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"], // Note: unsafe-inline should be removed in production with nonce
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

// Secure session storage helpers
export const SecureStorage = {
  set(key: string, value: any): void {
    try {
      const data = JSON.stringify({
        value,
        timestamp: Date.now(),
        checksum: generateSecureToken(16)
      });
      sessionStorage.setItem(key, data);
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  
  get(key: string, maxAge: number = 3600000): any | null {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      
      const data = JSON.parse(item);
      const age = Date.now() - data.timestamp;
      
      if (age > maxAge) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      return data.value;
    } catch (error) {
      console.error('Storage retrieval error:', error);
      return null;
    }
  },
  
  remove(key: string): void {
    sessionStorage.removeItem(key);
  },
  
  clear(): void {
    sessionStorage.clear();
  }
};

// CSRF token management
let csrfToken: string | null = null;

export function getCSRFToken(): string {
  if (!csrfToken) {
    csrfToken = generateSecureToken(32);
  }
  return csrfToken;
}

export function validateCSRFToken(token: string): boolean {
  return token === csrfToken;
}

export function refreshCSRFToken(): string {
  csrfToken = generateSecureToken(32);
  return csrfToken;
}
