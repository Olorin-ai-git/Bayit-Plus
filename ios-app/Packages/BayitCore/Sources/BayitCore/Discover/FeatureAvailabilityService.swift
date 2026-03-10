import Foundation

public protocol FeatureAvailabilityChecking: Sendable {
    func checkAvailability(for feature: DiscoverFeature) async -> FeatureAvailabilityState
}

public struct FeatureAvailabilityDependencies: Sendable {
    public let isPremium: @Sendable () async -> Bool
    public let hasAvatar: @Sendable () async -> Bool
    public let hasMicrophonePermission: @Sendable () async -> Bool
    public let hasCompletedPreference: @Sendable (String) async -> Bool

    public init(
        isPremium: @escaping @Sendable () async -> Bool,
        hasAvatar: @escaping @Sendable () async -> Bool,
        hasMicrophonePermission: @escaping @Sendable () async -> Bool,
        hasCompletedPreference: @escaping @Sendable (String) async -> Bool
    ) {
        self.isPremium = isPremium
        self.hasAvatar = hasAvatar
        self.hasMicrophonePermission = hasMicrophonePermission
        self.hasCompletedPreference = hasCompletedPreference
    }
}

public final class FeatureAvailabilityService: FeatureAvailabilityChecking, Sendable {
    #if os(tvOS)
        private static let currentPlatform: Platform = .tvOS
    #else
        private static let currentPlatform: Platform = .iOS
    #endif

    private let dependencies: FeatureAvailabilityDependencies

    public init(dependencies: FeatureAvailabilityDependencies) {
        self.dependencies = dependencies
    }

    public func checkAvailability(
        for feature: DiscoverFeature
    ) async -> FeatureAvailabilityState {
        guard feature.platforms.contains(Self.currentPlatform) else {
            return platformRequirement(from: feature.platforms)
        }

        var missingPrerequisites: [FeaturePrerequisite] = []

        for prerequisite in feature.prerequisites {
            switch prerequisite.type {
            case .subscription:
                let premium = await dependencies.isPremium()
                if !premium {
                    return .premiumRequired
                }

            case .contentType:
                return .notAvailable(
                    reasonKey: prerequisite.labelKey
                )

            case .avatar:
                let avatarReady = await dependencies.hasAvatar()
                if !avatarReady {
                    missingPrerequisites.append(prerequisite)
                }

            case .microphone:
                let micReady = await dependencies.hasMicrophonePermission()
                if !micReady {
                    missingPrerequisites.append(prerequisite)
                }

            case .preference:
                let completed = await dependencies.hasCompletedPreference(
                    prerequisite.id
                )
                if !completed {
                    missingPrerequisites.append(prerequisite)
                }

            case .voiceClone:
                let avatarReady = await dependencies.hasAvatar()
                if !avatarReady {
                    missingPrerequisites.append(prerequisite)
                }
            }
        }

        if !missingPrerequisites.isEmpty {
            return .setupNeeded(missingPrerequisites)
        }

        return .ready
    }

    private func platformRequirement(
        from platforms: Set<Platform>
    ) -> FeatureAvailabilityState {
        if let required = platforms.first {
            return .platformOnly(required)
        }
        return .notAvailable(reasonKey: "discover.availability.noPlatform")
    }
}
