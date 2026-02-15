#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SceneKit
import SwiftUI

struct TVMagicMirrorView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var greeting: MagicMirrorGreeting?
    @State private var isLoading = true
    @State private var error: String?
    @State private var avatarId: String?
    @State private var glbData: Data?
    @State private var meshLoadFailed = false
    @State private var isMeshLoading = false
    @FocusState private var refreshButtonFocused: Bool

    var body: some View {
        ZStack {
            DesignTokens.Colors.Background.primary.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    if isLoading && greeting == nil {
                        ProgressView()
                            .tint(.white)
                            .padding(.top, TVDesignTokens.Spacing.xxxl)
                    } else if let errorMsg = error, greeting == nil {
                        TVMagicMirrorErrorView(message: errorMsg) {
                            Task { await loadGreeting() }
                        }
                    } else if let greeting = greeting {
                        greetingContent(greeting)
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.xl)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
        .task {
            await loadGreeting()
        }
    }

    @ViewBuilder
    private func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(localization.t("zehAni.magicMirror.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Colors.Text.primary)

            avatarSceneView

            TVMagicMirrorGreetingCard(greeting: greeting)

            TVMagicMirrorVocabularyCard(greeting: greeting)

            TVMagicMirrorRefreshButton(isFocused: $refreshButtonFocused) {
                Task { await loadGreeting() }
            }
        }
    }

    @ViewBuilder
    private var avatarSceneView: some View {
        if let glbData = glbData {
            // Success: Render 3D avatar
            MagicMirrorAvatarSceneView(glbData: glbData)
                .frame(width: 360, height: 360)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Colors.Glass.border, lineWidth: 2)
                )
                .shadow(color: DesignTokens.Glass.purpleGlow, radius: 12, x: 0, y: 4)
        } else if isMeshLoading {
            // Loading: Show spinner
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(DesignTokens.Colors.Glass.backgroundLight.opacity(0.3))
                .frame(width: 360, height: 360)
                .overlay {
                    VStack(spacing: TVDesignTokens.Spacing.sm) {
                        ProgressView()
                            .tint(.white)
                        Text(localization.t("zehAni.avatar3d.loading"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Colors.Text.muted)
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Colors.Glass.border, lineWidth: 2)
                )
        } else if meshLoadFailed {
            // Failure: Show fallback icon
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(DesignTokens.Colors.Glass.backgroundLight.opacity(0.3))
                .frame(width: 360, height: 360)
                .overlay {
                    VStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "person.crop.circle")
                            .font(.system(size: 48))
                            .foregroundStyle(DesignTokens.Colors.Text.muted)
                        Text(localization.t("zehAni.magicMirror.meshUnavailable"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Colors.Text.muted)
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Colors.Glass.border, lineWidth: 2)
                )
        }
    }

    private func loadAvatarId() async {
        do {
            let avatarsResponse = try await repos.starStory.fetchAvatars(profileId: profileId)
            let fetchedAvatarId = avatarsResponse.avatars.first?.avatarId

            await MainActor.run {
                avatarId = fetchedAvatarId
            }

            if let avatarId = fetchedAvatarId {
                await loadAvatarMesh(avatarId: avatarId)
            } else {
                await MainActor.run {
                    meshLoadFailed = true
                }
            }
        } catch {
            await MainActor.run {
                meshLoadFailed = true
            }
        }
    }

    private func loadAvatarMesh(avatarId: String) async {
        await MainActor.run {
            isMeshLoading = true
        }

        do {
            let meshGlb = try await repos.avatarMeshRepository.fetchGlbUrl(avatarId: avatarId)

            guard let url = URL(string: meshGlb.signedUrl) else {
                await MainActor.run {
                    meshLoadFailed = true
                    isMeshLoading = false
                }
                return
            }

            let (data, response) = try await URLSession.shared.data(from: url)
            let httpStatus = (response as? HTTPURLResponse)?.statusCode ?? 0
            let isValidGlb = (httpStatus == 200 || httpStatus == 0) && data.count > 50_000

            await MainActor.run {
                if isValidGlb {
                    glbData = data
                    meshLoadFailed = false
                } else {
                    meshLoadFailed = true
                }
                isMeshLoading = false
            }
        } catch {
            await MainActor.run {
                meshLoadFailed = true
                isMeshLoading = false
            }
        }
    }

    private func loadGreeting() async {
        isLoading = true
        error = nil

        do {
            let fetchedGreeting = try await repos.avatarMeshRepository.getMagicMirrorGreeting(
                profileId: profileId
            )
            await MainActor.run {
                greeting = fetchedGreeting
                isLoading = false
            }
            await loadAvatarId()
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }
}
#endif
