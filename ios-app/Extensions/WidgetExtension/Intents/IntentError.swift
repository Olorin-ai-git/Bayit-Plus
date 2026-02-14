import AppIntents

/// Errors that can occur during widget intent execution.
enum IntentError: Error, CustomLocalizedStringResourceConvertible {
    case notAuthenticated
    case unauthorized

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .notAuthenticated:
            return "Please sign in to Bayit+ to use this feature"
        case .unauthorized:
            return "You don't have permission to access this content"
        }
    }
}
