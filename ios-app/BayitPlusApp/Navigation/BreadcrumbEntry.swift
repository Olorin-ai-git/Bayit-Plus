import Foundation

/// A single breadcrumb entry for the navigation trail
struct BreadcrumbEntry: Identifiable {
    let id = UUID()
    let label: String
    let icon: String?
    let popCount: Int // How many levels to pop (0 = root)
}
