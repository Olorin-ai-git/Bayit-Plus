import AVKit
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

// MARK: - Greeting Cards, Avatar Display Helpers, and Data Loading

extension MagicMirrorView {
    // playGreetingButton and avatarPlaceholder live in MagicMirrorView+AvatarDisplay.swift.

    func greetingCard(_ greeting: MagicMirrorGreeting) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(greeting.greetingTextHe)
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)

                Text(greeting.greetingTextEn)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    @ViewBuilder
    func vocabularyCard(_ greeting: MagicMirrorGreeting) -> some View {
        if let vocab = greeting.vocabularyOfTheDay {
            MagicMirrorVocabCard(vocabulary: vocab)
        }
    }

    // MARK: - Error and Refresh

    func errorView(_ message: String) -> some View {
        Text(message)
            .foregroundStyle(DesignTokens.ErrorColor.default)
            .font(.system(size: DesignTokens.FontSize.md))
    }

    var refreshButton: some View {
        GlassButton(
            localization.t("zehAni.magicMirror.refresh"),
            variant: .secondary
        ) {
            loadGreeting()
        }
    }

    var reRecordButton: some View {
        GlassButton(localization.t("avatar.settings.reRecord"), variant: .secondary) {
            starStoryVM = StarStoryViewModel(repository: repos.starStory)
            showAvatarCreation = true
        }
    }

    // MARK: - Data Loading

    func loadGreeting() {
        isLoading = true
        error = nil
        noAvatar = false
        avatarImageUrl = nil
        isPlayingVideo = false
        player = nil

        Task {
            do {
                let avatarsResponse = try await repos.starStory.fetchAvatars(
                    profileId: profileId
                )
                let loadedAvatars = avatarsResponse.avatars

                if loadedAvatars.isEmpty {
                    await MainActor.run {
                        noAvatar = true
                        isLoading = false
                    }
                    return
                }

                let targetAvatarId = selectedAvatarId
                    ?? loadedAvatars.first(where: { $0.isActiveAvatar })?.avatarId
                    ?? loadedAvatars.first?.avatarId

                let fetched = try await repos.avatarMeshRepository.getMagicMirrorGreeting(
                    profileId: profileId,
                    avatarId: targetAvatarId
                )

                await MainActor.run {
                    avatars = loadedAvatars
                    selectedAvatarId = targetAvatarId
                    existingAvatarId = targetAvatarId
                    greeting = fetched
                    isLoading = false
                }

                if let targetAvatarId {
                    await loadAvatarImage(avatarId: targetAvatarId)
                }
            } catch let apiError as APIError {
                await MainActor.run {
                    if case .notFound = apiError {
                        noAvatar = true
                    } else {
                        self.error = apiError.localizedDescription
                    }
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }

    func loadAvatarImage(avatarId: String) async {
        let selected = avatars.first(where: { $0.avatarId == avatarId })
        if let imageUrl = selected?.creatifyAvatarImageUrl {
            await MainActor.run { avatarImageUrl = imageUrl }
            return
        }

        do {
            let status = try await repos.avatarMeshRepository.fetchAvatarStatus(
                avatarId: avatarId
            )
            await MainActor.run {
                avatarImageUrl = status.avatarImageUrl
            }
        } catch {
            // Avatar image is optional; greeting still works without it
        }
    }
}
