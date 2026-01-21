// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Admin Integration for CV Processing
 *
 * Provides integration layer for admin services from @cvplus/admin submodule.
 * Uses dependency injection pattern to avoid direct dependencies between same-layer modules.
 */

// Integration types for admin services
export interface PolicyCheckRequest {
  userId: string;
  fileType?: string;
  fileSize?: number;
  content?: string;
  metadata?: any;
}

export interface PolicyViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  requiresAction: boolean;
  message: string;
}

export interface PolicyCheckResult {
  allowed: boolean;
  reasons?: string[];
  warnings?: string[];
  violations: PolicyViolation[];
}

export interface AdminAccessService {
  isAdmin(userId: string): Promise<boolean>;
  requireAdminAccess(userId: string): Promise<void>;
}

export interface PolicyEnforcementService {
  checkUploadPolicy(request: PolicyCheckRequest): Promise<PolicyCheckResult>;
  validateContent(content: string): Promise<{ isValid: boolean; issues: string[] }>;
}

export interface AdminProvider {
  createAdminAccessService(): AdminAccessService;
  createPolicyEnforcementService(): PolicyEnforcementService;
}

/**
 * Integration layer for admin services
 */
export class AdminIntegration {
  private static provider: AdminProvider | null = null;

  /**
   * Set the admin provider (called by root application during startup)
   */
  static setProvider(provider: AdminProvider): void {
    this.provider = provider;
  }

  /**
   * Get admin access service from admin submodule
   */
  static getAdminAccessService(): AdminAccessService | null {
    if (!this.provider) {
      return null;
    }

    try {
      return this.provider.createAdminAccessService();
    } catch (error) {
      console.warn('Failed to create admin access service:', error);
      return null;
    }
  }

  /**
   * Get policy enforcement service from admin submodule
   */
  static getPolicyEnforcementService(): PolicyEnforcementService | null {
    if (!this.provider) {
      return null;
    }

    try {
      return this.provider.createPolicyEnforcementService();
    } catch (error) {
      console.warn('Failed to create policy enforcement service:', error);
      return null;
    }
  }

  /**
   * Create fallback admin access service
   */
  static createFallbackAdminAccessService(): AdminAccessService {
    return new FallbackAdminAccessService();
  }

  /**
   * Create fallback policy enforcement service
   */
  static createFallbackPolicyEnforcementService(): PolicyEnforcementService {
    return new FallbackPolicyEnforcementService();
  }

  /**
   * Get admin access service with fallback
   */
  static getAdminAccessServiceWithFallback(): AdminAccessService {
    return this.getAdminAccessService() || this.createFallbackAdminAccessService();
  }

  /**
   * Get policy enforcement service with fallback
   */
  static getPolicyEnforcementServiceWithFallback(): PolicyEnforcementService {
    return this.getPolicyEnforcementService() || this.createFallbackPolicyEnforcementService();
  }

  /**
   * Check if provider is available
   */
  static isProviderAvailable(): boolean {
    return this.provider !== null;
  }
}

/**
 * Fallback admin access service for when admin submodule is not available
 */
export class FallbackAdminAccessService implements AdminAccessService {
  async isAdmin(userId: string): Promise<boolean> {
    // Fallback - always return false for security
    console.warn('Admin access check running in fallback mode - denying access');
    return false;
  }

  async requireAdminAccess(userId: string): Promise<void> {
    const isAdmin = await this.isAdmin(userId);
    if (!isAdmin) {
      throw new Error('Admin access required (fallback mode)');
    }
  }
}

/**
 * Fallback policy enforcement service for when admin submodule is not available
 */
export class FallbackPolicyEnforcementService implements PolicyEnforcementService {
  async checkUploadPolicy(request: PolicyCheckRequest): Promise<PolicyCheckResult> {
    // Basic fallback policy checking
    const violations: PolicyViolation[] = [];

    // Basic file size check
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (request.fileSize && request.fileSize > maxFileSize) {
      violations.push({
        type: 'file_size_exceeded',
        severity: 'high',
        requiresAction: true,
        message: 'File size exceeds maximum allowed size (10MB)'
      });
    }

    // Basic file type check
    const allowedTypes = ['pdf', 'doc', 'docx', 'txt'];
    if (request.fileType && !allowedTypes.includes(request.fileType.toLowerCase())) {
      violations.push({
        type: 'invalid_file_type',
        severity: 'critical',
        requiresAction: true,
        message: 'File type not allowed'
      });
    }

    const warnings = violations.length > 0 ? [] : ['Policy enforcement running in fallback mode'];

    return {
      allowed: violations.length === 0,
      reasons: violations.map(v => v.message),
      warnings,
      violations
    };
  }

  async validateContent(content: string): Promise<{ isValid: boolean; issues: string[] }> {
    // Basic content validation - check for obviously malicious patterns
    const issues: string[] = [];

    if (content.includes('<script>') || content.includes('javascript:')) {
      issues.push('Potentially unsafe script content detected');
    }

    if (content.length > 1000000) { // 1MB of text
      issues.push('Content size too large');
    }

    if (issues.length === 0) {
      issues.push('Content validation running in fallback mode');
    }

    return {
      isValid: issues.length === 1 && issues[0].includes('fallback mode'),
      issues
    };
  }
}

// Export singleton instances for compatibility
export const AdminAccessService = AdminIntegration.getAdminAccessServiceWithFallback();
export const PolicyEnforcementService = AdminIntegration.getPolicyEnforcementServiceWithFallback();