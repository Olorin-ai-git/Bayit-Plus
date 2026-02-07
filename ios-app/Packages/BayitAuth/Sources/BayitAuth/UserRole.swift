import Foundation

/// User roles matching the backend RBAC system.
///
/// Maps to the backend `role` field on the User model.
/// Roles: super_admin, admin, content_manager, billing_admin, support, viewer, user
public enum UserRole: String, Codable, Sendable, CaseIterable {
    case superAdmin = "super_admin"
    case admin = "admin"
    case contentManager = "content_manager"
    case billingAdmin = "billing_admin"
    case support = "support"
    case viewer = "viewer"
    case user = "user"

    /// Whether this role has administrative privileges.
    public var isAdmin: Bool {
        switch self {
        case .superAdmin, .admin, .contentManager, .billingAdmin, .support:
            return true
        case .viewer, .user:
            return false
        }
    }
}
