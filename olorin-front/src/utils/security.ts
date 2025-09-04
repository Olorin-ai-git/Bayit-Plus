/**
 * Enhanced Security Utilities for Olorin Frontend
 * Implements comprehensive client-side security controls and validation.
 * 
 * Author: Claude Security Specialist
 * Date: 2025-08-29
 */

import DOMPurify from 'dompurify';

// Security configuration
export interface SecurityConfig {
  enableXSSProtection: boolean;
  enableCSRFProtection: boolean;
  enableInputValidation: boolean;
  maxInputLength: number;
  allowedDomains: string[];
  sessionTimeoutMinutes: number;
  enableSecurityHeaders: boolean;
}

const defaultSecurityConfig: SecurityConfig = {
  enableXSSProtection: true,
  enableCSRFProtection: true,
  enableInputValidation: true,
  maxInputLength: 10000,
  allowedDomains: ['localhost:3000', 'olorin-app.com'],
  sessionTimeoutMinutes: 30,
  enableSecurityHeaders: true,
};

// XSS Protection utilities
export class XSSProtection {
  private static config = defaultSecurityConfig;

  static configure(config: Partial<SecurityConfig>): void {
    this.config = { ...defaultSecurityConfig, ...config };
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHTML(input: string, options?: {
    allowedTags?: string[];
    allowedAttributes?: string[];
  }): string {
    if (!this.config.enableXSSProtection) {
      return input;
    }

    const sanitizeConfig = {
      ALLOWED_TAGS: options?.allowedTags || [
        'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'
      ],
      ALLOWED_ATTR: options?.allowedAttributes || [],
      FORBID_SCRIPT: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    };

    return DOMPurify.sanitize(input, sanitizeConfig);
  }

  /**
   * Sanitize text input to prevent injection attacks
   */
  static sanitizeText(input: string): string {
    if (!this.config.enableXSSProtection) {
      return input;
    }

    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/data:/gi, '') // Remove data: protocols
      .replace(/vbscript:/gi, '') // Remove vbscript: protocols
      .trim();
  }

  /**
   * Validate and sanitize URL to prevent malicious redirects
   */
  static sanitizeURL(url: string): string | null {
    try {
      const urlObject = new URL(url);
      
      // Check if protocol is allowed
      const allowedProtocols = ['http:', 'https:', 'mailto:'];
      if (!allowedProtocols.includes(urlObject.protocol)) {
        console.warn(`Blocked URL with disallowed protocol: ${urlObject.protocol}`);
        return null;
      }

      // Check if domain is in allowed list for relative URLs
      if (this.config.allowedDomains.length > 0) {
        const isAllowed = this.config.allowedDomains.some(domain => 
          urlObject.hostname === domain || 
          urlObject.hostname.endsWith(`.${domain}`)
        );
        
        if (!isAllowed && urlObject.hostname) {
          console.warn(`Blocked URL with disallowed domain: ${urlObject.hostname}`);
          return null;
        }
      }

      return urlObject.toString();
    } catch (error) {
      console.warn(`Invalid URL format: ${url}`);
      return null;
    }
  }
}

// Input validation utilities
export class InputValidator {
  /**
   * Validate email format
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      return { valid: false, error: 'Email is required' };
    }
    
    if (email.length > 254) {
      return { valid: false, error: 'Email is too long' };
    }
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }
    
    // Check for potentially malicious patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /@.*@/, // Multiple @ symbols
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(email)) {
        return { valid: false, error: 'Email contains invalid characters' };
      }
    }
    
    return { valid: true };
  }

  /**
   * Validate username with security considerations
   */
  static validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username) {
      return { valid: false, error: 'Username is required' };
    }
    
    if (username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters' };
    }
    
    if (username.length > 50) {
      return { valid: false, error: 'Username must not exceed 50 characters' };
    }
    
    // Allow alphanumeric and limited special characters
    const validUsernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!validUsernameRegex.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, underscore, period, and hyphen' };
    }
    
    // Check for reserved usernames
    const reservedUsernames = [
      'admin', 'root', 'administrator', 'system', 'user',
      'test', 'guest', 'anonymous', 'null', 'undefined'
    ];
    
    if (reservedUsernames.includes(username.toLowerCase())) {
      return { valid: false, error: 'Username is reserved' };
    }
    
    return { valid: true };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { 
    valid: boolean; 
    error?: string; 
    strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0;
    
    if (!password) {
      return { 
        valid: false, 
        error: 'Password is required',
        strength: 'weak',
        suggestions: ['Password is required']
      };
    }
    
    // Length checks
    if (password.length < 8) {
      suggestions.push('Use at least 8 characters');
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push('Include lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push('Include uppercase letters');
    
    if (/\d/.test(password)) score += 1;
    else suggestions.push('Include numbers');
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 2;
    else suggestions.push('Include special characters');
    
    // Common password checks
    const commonPasswords = [
      'password', '123456', 'qwerty', 'admin', 'login',
      'password123', '12345678', 'welcome'
    ];
    
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      score -= 3;
      suggestions.push('Avoid common passwords');
    }
    
    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    if (score < 3) strength = 'weak';
    else if (score < 5) strength = 'medium';
    else if (score < 7) strength = 'strong';
    else strength = 'very-strong';
    
    // Minimum requirements for validity
    const valid = password.length >= 8 && 
                  /[a-z]/.test(password) && 
                  /[A-Z]/.test(password) && 
                  /\d/.test(password);
    
    return {
      valid,
      error: valid ? undefined : 'Password does not meet minimum requirements',
      strength,
      suggestions: suggestions.slice(0, 3) // Limit suggestions
    };
  }

  /**
   * Validate general text input
   */
  static validateTextInput(
    input: string, 
    options: {
      maxLength?: number;
      allowHTML?: boolean;
      fieldName?: string;
    } = {}
  ): { valid: boolean; error?: string; sanitizedValue?: string } {
    const { 
      maxLength = defaultSecurityConfig.maxInputLength,
      allowHTML = false,
      fieldName = 'Input'
    } = options;
    
    if (input.length > maxLength) {
      return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength}` };
    }
    
    // Check for potentially malicious patterns
    const maliciousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /<script[^>]*>/i,
      /<iframe[^>]*>/i,
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(input)) {
        return { valid: false, error: `${fieldName} contains potentially malicious content` };
      }
    }
    
    // Sanitize the input
    let sanitizedValue = input;
    if (allowHTML) {
      sanitizedValue = XSSProtection.sanitizeHTML(input);
    } else {
      sanitizedValue = XSSProtection.sanitizeText(input);
    }
    
    return { valid: true, sanitizedValue };
  }
}

// CSRF Protection utilities
export class CSRFProtection {
  private static token: string | null = null;

  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    this.token = token;
    
    // Store in sessionStorage for persistence across pages
    sessionStorage.setItem('csrf_token', token);
    
    return token;
  }

  /**
   * Get current CSRF token
   */
  static getToken(): string {
    if (this.token) {
      return this.token;
    }
    
    // Try to retrieve from sessionStorage
    const stored = sessionStorage.getItem('csrf_token');
    if (stored) {
      this.token = stored;
      return stored;
    }
    
    // Generate new token if none exists
    return this.generateToken();
  }

  /**
   * Add CSRF token to request headers
   */
  static addTokenToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      'X-CSRF-Token': this.getToken()
    };
  }
}

// Session security utilities
export class SessionSecurity {
  private static readonly SESSION_KEY = 'olorin_session';
  private static readonly ACTIVITY_KEY = 'last_activity';

  /**
   * Initialize session tracking
   */
  static initializeSession(): void {
    this.updateActivity();
    this.setupActivityTracking();
  }

  /**
   * Update last activity timestamp
   */
  static updateActivity(): void {
    const now = Date.now();
    sessionStorage.setItem(this.ACTIVITY_KEY, now.toString());
  }

  /**
   * Check if session has timed out
   */
  static isSessionExpired(): boolean {
    const lastActivity = sessionStorage.getItem(this.ACTIVITY_KEY);
    if (!lastActivity) {
      return true;
    }

    const timeoutMs = defaultSecurityConfig.sessionTimeoutMinutes * 60 * 1000;
    const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
    
    return timeSinceActivity > timeoutMs;
  }

  /**
   * Clear session data
   */
  static clearSession(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.ACTIVITY_KEY);
    sessionStorage.removeItem('csrf_token');
    localStorage.removeItem('auth_token');
  }

  /**
   * Setup automatic activity tracking
   */
  private static setupActivityTracking(): void {
    // Track user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    let activityTimer: NodeJS.Timeout | null = null;
    
    const updateActivityDebounced = () => {
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
      
      activityTimer = setTimeout(() => {
        this.updateActivity();
      }, 1000); // Update at most once per second
    };
    
    events.forEach(event => {
      document.addEventListener(event, updateActivityDebounced, { passive: true });
    });
    
    // Check for session timeout periodically
    setInterval(() => {
      if (this.isSessionExpired()) {
        console.warn('Session expired due to inactivity');
        this.clearSession();
        // Dispatch custom event for app to handle
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      }
    }, 60000); // Check every minute
  }
}

// Content Security Policy utilities
export class CSPReporting {
  /**
   * Setup CSP violation reporting
   */
  static setupCSPReporting(): void {
    document.addEventListener('securitypolicyviolation', (event) => {
      this.reportCSPViolation({
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
        violatedDirective: event.violatedDirective,
        effectiveDirective: event.effectiveDirective,
        originalPolicy: event.originalPolicy,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber,
        sourceFile: event.sourceFile
      });
    });
  }

  /**
   * Report CSP violation to backend
   */
  private static reportCSPViolation(violation: {
    blockedURI: string;
    documentURI: string;
    violatedDirective: string;
    effectiveDirective: string;
    originalPolicy: string;
    lineNumber?: number;
    columnNumber?: number;
    sourceFile?: string;
  }): void {
    // Log to console for development
    console.warn('CSP Violation:', violation);
    
    // Send to backend for production monitoring
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/security/csp-violation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...CSRFProtection.addTokenToHeaders()
        },
        body: JSON.stringify({
          violation,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      }).catch(error => {
        console.error('Failed to report CSP violation:', error);
      });
    }
  }
}

// Security utilities initialization
export class SecurityManager {
  private static initialized = false;

  /**
   * Initialize all security utilities
   */
  static initialize(config?: Partial<SecurityConfig>): void {
    if (this.initialized) {
      return;
    }

    if (config) {
      XSSProtection.configure(config);
    }

    // Initialize session security
    SessionSecurity.initializeSession();

    // Setup CSP reporting
    CSPReporting.setupCSPReporting();

    // Generate initial CSRF token
    CSRFProtection.generateToken();

    // Set up security event listeners
    this.setupSecurityEventListeners();

    this.initialized = true;
    console.log('🔒 Security Manager initialized');
  }

  /**
   * Setup security-related event listeners
   */
  private static setupSecurityEventListeners(): void {
    // Listen for session expiration
    window.addEventListener('sessionExpired', () => {
      // Redirect to login or show session expired modal
      console.warn('Session has expired');
    });

    // Monitor for potential clickjacking
    if (window.top !== window.self) {
      console.warn('Page loaded in frame - potential clickjacking attempt');
    }

    // Monitor for console access (basic protection)
    let consoleWarningShown = false;
    const originalConsole = console.log;
    console.log = function(...args) {
      if (!consoleWarningShown && process.env.NODE_ENV === 'production') {
        console.warn('🚨 Security Warning: Developer console access detected. Be cautious of any code you run here.');
        consoleWarningShown = true;
      }
      originalConsole.apply(console, args);
    };
  }

  /**
   * Get security status report
   */
  static getSecurityStatus(): {
    xssProtection: boolean;
    csrfProtection: boolean;
    sessionActive: boolean;
    sessionTimeRemaining: number;
  } {
    return {
      xssProtection: defaultSecurityConfig.enableXSSProtection,
      csrfProtection: defaultSecurityConfig.enableCSRFProtection,
      sessionActive: !SessionSecurity.isSessionExpired(),
      sessionTimeRemaining: this.getSessionTimeRemaining()
    };
  }

  private static getSessionTimeRemaining(): number {
    const lastActivity = sessionStorage.getItem('last_activity');
    if (!lastActivity) {
      return 0;
    }

    const timeoutMs = defaultSecurityConfig.sessionTimeoutMinutes * 60 * 1000;
    const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
    const remaining = timeoutMs - timeSinceActivity;
    
    return Math.max(0, Math.floor(remaining / 1000)); // Return seconds remaining
  }
}

// Default export
export default SecurityManager;