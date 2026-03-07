import BayitCore
import Foundation
import Observation

/// ViewModel for the Netflix-style profile selection screen.
/// Loads household members and persists the active profile across launches.
@MainActor
@Observable
final class TVProfileSelectionViewModel {
    private(set) var profiles: [HouseholdMember] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isSaving = false

    var selectedProfileId: String? {
        didSet {
            if let profileId = selectedProfileId {
                persistSelectedProfile(profileId)
            }
        }
    }

    private let householdRepository: any HouseholdRepository
    private let userRepository: any UserRepository
    private let logger = BayitLogger(category: "TVProfileSelection")

    private static let selectedProfileKey = "tv.bayit.plus.selectedProfileId"

    init(
        householdRepository: any HouseholdRepository,
        userRepository: any UserRepository
    ) {
        self.householdRepository = householdRepository
        self.userRepository = userRepository
        selectedProfileId = UserDefaults.standard.string(
            forKey: Self.selectedProfileKey
        )
    }

    func loadProfiles() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let household = try await householdRepository.fetchHousehold()
            profiles = household.members ?? []
            if profiles.isEmpty {
                let profile = try await userRepository.fetchProfile()
                profiles = [ownerAsMember(from: profile)]
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            } else {
                do {
                    let profile = try await userRepository.fetchProfile()
                    profiles = [ownerAsMember(from: profile)]
                } catch {
                    if let message = error.userFriendlyMessage {
                        self.error = message
                    }
                }
            }
        }

        isLoading = false
    }

    func selectProfile(_ member: HouseholdMember) {
        selectedProfileId = member.stableId
        logger.info("Profile selected: \(member.displayName ?? member.stableId)")
    }

    func addProfile(name: String, avatarId _: String?) async -> Bool {
        isSaving = true
        error = nil

        do {
            let household = try await householdRepository.fetchHousehold()
            try await householdRepository.inviteMember(
                householdId: household.householdId,
                email: name,
                role: "member"
            )
            await loadProfiles()
            isSaving = false
            return true
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            isSaving = false
            return false
        }
    }

    var hasPreviousSelection: Bool {
        guard let savedId = selectedProfileId else { return false }
        return profiles.contains { $0.stableId == savedId }
    }

    var shouldSkipSelection: Bool {
        profiles.count == 1
    }

    var singleProfile: HouseholdMember? {
        profiles.count == 1 ? profiles.first : nil
    }

    // MARK: - Private

    private func ownerAsMember(from profile: ProfileResponse) -> HouseholdMember {
        HouseholdMember(
            id: profile.id,
            userId: profile.id,
            displayName: profile.displayName,
            role: "owner",
            avatar: profile.avatar,
            joinedAt: profile.createdAt
        )
    }

    private func persistSelectedProfile(_ profileId: String) {
        UserDefaults.standard.set(profileId, forKey: Self.selectedProfileKey)
    }

    func clearSelection() {
        selectedProfileId = nil
        UserDefaults.standard.removeObject(forKey: Self.selectedProfileKey)
    }
}
