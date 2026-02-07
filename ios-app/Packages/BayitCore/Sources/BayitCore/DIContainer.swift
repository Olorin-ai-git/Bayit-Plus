import SwiftUI

/// Lightweight dependency injection container
/// Injected via SwiftUI @Environment for view access
@Observable
public final class DIContainer: @unchecked Sendable {
    private var factories: [String: @Sendable () -> Any] = [:]
    private var singletons: [String: Any] = [:]
    private let lock = NSLock()

    public init() {}

    /// Register a transient dependency (new instance each time)
    public func register<T>(_ type: T.Type, factory: @escaping @Sendable () -> T) {
        let key = String(describing: type)
        lock.lock()
        defer { lock.unlock() }
        factories[key] = factory
    }

    /// Register a singleton dependency (shared instance)
    public func registerSingleton<T>(_ type: T.Type, instance: T) {
        let key = String(describing: type)
        lock.lock()
        defer { lock.unlock() }
        singletons[key] = instance
    }

    /// Resolve a dependency
    public func resolve<T>(_ type: T.Type) -> T {
        let key = String(describing: type)
        lock.lock()
        defer { lock.unlock() }

        if let singleton = singletons[key] as? T {
            return singleton
        }

        if let factory = factories[key], let instance = factory() as? T {
            return instance
        }

        fatalError(
            "Dependency \(key) not registered in DIContainer. "
            + "Register it during app initialization."
        )
    }

    /// Try to resolve a dependency, returning nil if not registered
    public func resolveOptional<T>(_ type: T.Type) -> T? {
        let key = String(describing: type)
        lock.lock()
        defer { lock.unlock() }

        if let singleton = singletons[key] as? T {
            return singleton
        }

        if let factory = factories[key], let instance = factory() as? T {
            return instance
        }

        return nil
    }
}

// MARK: - SwiftUI Environment Integration

public struct DIContainerKey: EnvironmentKey {
    public static let defaultValue = DIContainer()
}

extension EnvironmentValues {
    public var diContainer: DIContainer {
        get { self[DIContainerKey.self] }
        set { self[DIContainerKey.self] = newValue }
    }
}
