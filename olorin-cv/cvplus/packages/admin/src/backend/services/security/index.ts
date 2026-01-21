/**
 * CVPlus Core Security Services
 *
 * Consolidated security services for the entire CVPlus platform.
 * All modules should use these services to ensure consistent security policies.
  */

export {
  SecureRateLimitGuard,
  secureRateLimitGuard,
  type RateLimitResult,
  type RateLimitConfig,
} from './rate-limit-guard.service';