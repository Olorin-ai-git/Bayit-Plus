import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SceneKit
import SwiftUI

struct MagicMirrorView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var greeting: MagicMirrorGreeting?
    @State private var isLoading = true
    @State private var error: String?
    @State private var noAvatar = false
    @State private var showAvatarCreation = false
    @State private var starStoryVM: StarStoryViewModel?
    @State private var existingAvatarId: String?
    @State private var glbData: Data?
    @State private var meshLoadFailed = false
    @State private var debugInfo: String = ""

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: DesignTokens.Spacing.lg) {
                ZehAniBreadcrumb(currentLabel: "Magic Mirror")

                if isLoading {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                } else if noAvatar {
                    createAvatarPrompt
                } else if let error = error {
                    Spacer()
                    errorView(error)
                    refreshButton
                    Spacer()
                } else if let greeting = greeting {
                    greetingContent(greeting)
                    #if DEBUG
                    if !debugInfo.isEmpty {
                        Text(debugInfo)
                            .font(.system(size: 10))
                            .foregroundStyle(.red)
                            .padding(4)
                    }
                    #endif
                    reRecordButton
                    refreshButton
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .sheet(isPresented: $showAvatarCreation) {
            AvatarCreationView(
                profileId: profileId,
                viewModel: starStoryVM,
                skipConsent: existingAvatarId != nil,
                existingAvatarId: existingAvatarId
            )
        }
        .onChange(of: showAvatarCreation) { _, isShowing in
            if !isShowing { loadGreeting() }
        }
        .onAppear { loadGreeting() }
    }

    // MARK: - Create Avatar Prompt

    private var createAvatarPrompt: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            Image(systemName: "wand.and.stars")
                .font(.system(size: 56))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("zehAni.magicMirror.noAvatar"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("zehAni.magicMirror.noAvatarDesc"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)

            GlassButton(
                localization.t("zehAni.magicMirror.createAvatar"),
                variant: .primary
            ) {
                starStoryVM = StarStoryViewModel(
                    repository: repos.starStory
                )
                showAvatarCreation = true
            }

            Spacer()
        }
    }

    // MARK: - Greeting Content

    @ViewBuilder
    private func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                avatarSceneView
                greetingCard(greeting)
                vocabularyCard(greeting)
            }
        }
    }

    @ViewBuilder
    private var avatarSceneView: some View {
        if let glbData = glbData {
            SceneKitView(glbData: glbData)
                .frame(height: 280)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
        } else if meshLoadFailed {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bg.opacity(0.3))
                .frame(height: 280)
                .overlay {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "person.crop.circle")
                            .font(.system(size: 48))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(localization.t("zehAni.magicMirror.meshUnavailable"))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
        } else {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bg.opacity(0.3))
                .frame(height: 280)
                .overlay { ProgressView().tint(.white) }
        }
    }

    @ViewBuilder
    private func greetingCard(_ greeting: MagicMirrorGreeting) -> some View {
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
    private func vocabularyCard(_ greeting: MagicMirrorGreeting) -> some View {
        if let vocab = greeting.vocabularyOfTheDay {
            MagicMirrorVocabCard(vocabulary: vocab)
        }
    }

    // MARK: - Error & Refresh

    @ViewBuilder
    private func errorView(_ message: String) -> some View {
        Text(message)
            .foregroundStyle(DesignTokens.ErrorColor.default)
            .font(.system(size: DesignTokens.FontSize.md))
    }

    private var refreshButton: some View {
        GlassButton(
            localization.t("zehAni.magicMirror.refresh"),
            variant: .secondary
        ) {
            loadGreeting()
        }
    }

    private var reRecordButton: some View {
        GlassButton(localization.t("avatar.settings.reRecord"), variant: .secondary) {
            starStoryVM = StarStoryViewModel(repository: repos.starStory)
            showAvatarCreation = true
        }
    }

    // MARK: - Data Loading

    private func loadGreeting() {
        isLoading = true
        error = nil
        noAvatar = false
        glbData = nil
        meshLoadFailed = false

        Task {
            do {
                async let greetingTask = repos.avatarMeshRepository.getMagicMirrorGreeting(
                    profileId: profileId
                )
                async let avatarsTask = repos.starStory.fetchAvatars(profileId: profileId)

                let fetched = try await greetingTask
                let avatarsResponse: AvatarsResponse?
                do {
                    avatarsResponse = try await avatarsTask
                } catch {
                    avatarsResponse = nil
                    await MainActor.run {
                        debugInfo = "Avatars decode: \(error)"
                    }
                }
                let avatarId = avatarsResponse?.avatars.first?.avatarId
                await MainActor.run {
                    debugInfo += " | id=\(avatarId ?? "nil") cnt=\(avatarsResponse?.avatars.count ?? -1)"
                }

                await MainActor.run {
                    greeting = fetched
                    existingAvatarId = avatarId
                    isLoading = false
                }

                if let avatarId {
                    await loadAvatarMesh(avatarId: avatarId)
                } else {
                    await MainActor.run { meshLoadFailed = true }
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

    private func loadAvatarMesh(avatarId: String) async {
        do {
            let meshGlb = try await repos.avatarMeshRepository.fetchGlbUrl(
                avatarId: avatarId
            )
            guard let url = URL(string: meshGlb.signedUrl) else {
                await MainActor.run {
                    meshLoadFailed = true
                    debugInfo += " | badURL"
                }
                return
            }
            let (data, _) = try await URLSession.shared.data(from: url)
            await MainActor.run {
                debugInfo += " | glb=\(data.count)B"
                glbData = data
            }
        } catch {
            await MainActor.run {
                meshLoadFailed = true
                debugInfo += " | meshErr=\(error)"
            }
        }
    }
}
