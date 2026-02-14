import BayitCore
import Foundation
import Observation

@MainActor
@Observable
final class StarStoryViewModel {
    private(set) var avatars: [StarStoryAvatar] = []
    private(set) var episodes: [StarStoryEpisode] = []
    private(set) var generationProgress: StarStoryGenerationProgress?
    private(set) var generatingEpisodeId: String?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    var isGenerating: Bool { generatingEpisodeId != nil }

    private let repository: any StarStoryRepository
    private let logger = BayitLogger(category: "StarStoryViewModel")
    private var pollTask: Task<Void, Never>?

    init(repository: any StarStoryRepository) {
        self.repository = repository
    }

    func loadAvatars(profileId: String) async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        do {
            let response = try await repository.fetchAvatars(profileId: profileId)
            avatars = response.avatars
            logger.info("Fetched \(avatars.count) avatars")
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to fetch avatars", error: error)
        }

        isLoading = false
    }

    func grantConsent(
        profileId: String,
        childFirstName: String,
        pin: String
    ) async -> Bool {
        let response = await grantConsentFull(
            profileId: profileId,
            childFirstName: childFirstName,
            pin: pin
        )
        return response?.success ?? false
    }

    func grantConsentFull(
        profileId: String,
        childFirstName: String,
        pin: String
    ) async -> ConsentResponse? {
        errorMessage = nil

        do {
            let response = try await repository.grantConsent(
                profileId: profileId,
                childFirstName: childFirstName,
                pin: pin
            )
            logger.info("Consent granted: \(response.success)")
            return response
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to grant consent", error: error)
            return nil
        }
    }

    func uploadVideoSelfie(avatarId: String, videoData: Data) async -> Bool {
        errorMessage = nil

        do {
            let response = try await repository.uploadVideoSelfie(
                avatarId: avatarId,
                videoData: videoData
            )
            logger.info("Video selfie uploaded for avatar \(response.avatarId)")
            return true
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to upload video selfie", error: error)
            return false
        }
    }

    func startGeneration(
        profileId: String,
        avatarId: String,
        theme: String,
        targetVocabulary: [String]
    ) async {
        errorMessage = nil

        do {
            let response = try await repository.generateEpisode(
                profileId: profileId,
                avatarId: avatarId,
                theme: theme,
                targetVocabulary: targetVocabulary
            )
            generatingEpisodeId = response.episodeId
            logger.info("Generation started: \(response.episodeId)")
            startPolling(episodeId: response.episodeId, profileId: profileId)
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to start generation", error: error)
        }
    }

    func loadEpisodes(profileId: String) async {
        errorMessage = nil

        do {
            let response = try await repository.fetchEpisodes(profileId: profileId)
            episodes = response.episodes
            logger.info("Fetched \(episodes.count) episodes")
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to fetch episodes", error: error)
        }
    }

    func revokeConsent(profileId: String) async {
        errorMessage = nil

        do {
            try await repository.revokeConsent(profileId: profileId)
            avatars = []
            episodes = []
            logger.info("Consent revoked for profile \(profileId)")
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to revoke consent", error: error)
        }
    }

    func processVideoAndGenerateMesh(
        avatarId: String, videoData: Data,
        profileId: String, pin: String,
        meshRepo: any AvatarMeshRepository
    ) async -> Bool {
        let uploaded = await uploadVideoSelfie(avatarId: avatarId, videoData: videoData)
        guard uploaded else { return false }

        do {
            _ = try await meshRepo.generateMesh(
                avatarId: avatarId, profileId: profileId, pin: pin
            )
            logger.info("Mesh generation triggered for avatar \(avatarId)")
            return true
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to trigger mesh generation", error: error)
            return false
        }
    }

    func uploadARKitMesh(
        avatarId: String,
        glbData: Data,
        profileId: String,
        pin: String,
        meshRepo: any AvatarMeshRepository
    ) async -> Bool {
        errorMessage = nil

        do {
            let status = try await meshRepo.uploadGlbMesh(
                avatarId: avatarId,
                profileId: profileId,
                pin: pin,
                glbData: glbData
            )
            logger.info("ARKit mesh uploaded for avatar \(status.avatarId)")
            return status.status == "ready"
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to upload ARKit mesh", error: error)
            return false
        }
    }

    func cancelPolling() {
        pollTask?.cancel()
        pollTask = nil
        generatingEpisodeId = nil
        generationProgress = nil
    }

    // MARK: - Private

    private func startPolling(episodeId: String, profileId: String) {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(3))
                guard !Task.isCancelled else { break }

                do {
                    let progress = try await self?.repository.pollProgress(episodeId: episodeId)
                    self?.generationProgress = progress

                    if progress?.status == "completed" || progress?.status == "failed" {
                        self?.generatingEpisodeId = nil
                        if progress?.status == "completed" {
                            await self?.loadEpisodes(profileId: profileId)
                        }
                        break
                    }
                } catch {
                    self?.logger.error("Poll failed", error: error)
                }
            }
        }
    }
}
