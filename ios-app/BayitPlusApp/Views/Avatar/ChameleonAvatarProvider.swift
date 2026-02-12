import BayitCore
import BayitLocalization
import BayitNetworking
import Foundation

/// Background style-matching provider for avatar + show combos via Chameleon Engine.
/// Checks cache, triggers preparation if needed, polls until ready.
@Observable
final class ChameleonAvatarProvider {

    var avatarUrl: String?
    var isReady = false
    var isLoading = false
    var error: String?

    private let logger = BayitLogger(category: "ChameleonAvatar")
    private var pollTimer: Timer?
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    deinit {
        stopPolling()
    }

    // MARK: - Public

    func prepare(avatarId: String, showContentId: String) async {
        await MainActor.run {
            isLoading = true
            isReady = false
            error = nil
            avatarUrl = nil
        }

        do {
            let cached: CachedResponse = try await client.get(
                "/api/v1/chameleon/cached?avatar_id=\(avatarId)&show_content_id=\(showContentId)",
                as: CachedResponse.self
            )

            if cached.cached, let cache = cached.cache, cache.status == "ready" {
                await applyReady(cache)
                logger.info("Cached style found for avatar \(avatarId)")
                return
            }

            let prepared: StyleCacheResponse = try await client.post(
                "/api/v1/chameleon/prepare",
                body: PrepareBody(avatarId: avatarId, showContentId: showContentId),
                as: StyleCacheResponse.self
            )

            if prepared.status == "ready" {
                await applyReady(prepared)
                logger.info("Prepare returned ready for \(prepared.id)")
            } else {
                await startPolling(cacheId: prepared.id)
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoading = false
            }
            logger.error("Prepare failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Polling

    @MainActor
    private func startPolling(cacheId: String) {
        stopPolling()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            guard let self else { return }
            Task { await self.checkStatus(cacheId: cacheId) }
        }
    }

    private func checkStatus(cacheId: String) async {
        do {
            let data: StyleCacheResponse = try await client.get(
                "/api/v1/chameleon/status/\(cacheId)",
                as: StyleCacheResponse.self
            )

            if data.status == "ready" {
                await applyReady(data)
                await MainActor.run { stopPolling() }
                logger.info("Style transfer ready: \(cacheId)")
            } else if data.status == "failed" {
                await MainActor.run {
                    error = LocalizationManager.shared.t("chameleon.errors.unavailable")
                    isLoading = false
                    stopPolling()
                }
                logger.warn("Style transfer failed: \(cacheId)")
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoading = false
                stopPolling()
            }
            logger.error("Poll error: \(error.localizedDescription)")
        }
    }

    // MARK: - Helpers

    @MainActor
    private func applyReady(_ cache: StyleCacheResponse) {
        avatarUrl = cache.poses.first?.gcsPath
        isReady = true
        isLoading = false
    }

    @MainActor
    private func stopPolling() {
        pollTimer?.invalidate()
        pollTimer = nil
    }
}

// MARK: - API Models

private struct PrepareBody: Encodable {
    let avatarId: String
    let showContentId: String

    enum CodingKeys: String, CodingKey {
        case avatarId = "avatar_id"
        case showContentId = "show_content_id"
    }
}

private struct CachedResponse: Decodable {
    let cached: Bool
    let cache: StyleCacheResponse?
}

struct StyleCacheResponse: Decodable {
    let id: String
    let avatarId: String
    let showContentId: String
    let status: String
    let clipSimilarityScore: Double?
    let posesCount: Int
    let poses: [PoseEntry]
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case avatarId = "avatar_id"
        case showContentId = "show_content_id"
        case status
        case clipSimilarityScore = "clip_similarity_score"
        case posesCount = "poses_count"
        case poses
        case createdAt = "created_at"
    }
}

struct PoseEntry: Decodable {
    let poseName: String
    let gcsPath: String
    let width: Int
    let height: Int

    enum CodingKeys: String, CodingKey {
        case poseName = "pose_name"
        case gcsPath = "gcs_path"
        case width, height
    }
}
