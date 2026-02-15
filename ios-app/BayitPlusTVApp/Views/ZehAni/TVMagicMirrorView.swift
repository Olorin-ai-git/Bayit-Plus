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
    @State private var existingAvatarId: String?
    @State private var glbData: Data?
    @State private var meshLoadFailed = false
    @FocusState private var refreshButtonFocused: Bool

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if isLoading {
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.5)
            } else if let errorMsg = error {
                errorView(errorMsg)
            } else if let greeting = greeting {
                greetingContent(greeting)
            }
        }
        .onAppear {
            loadGreeting()
        }
    }

    @ViewBuilder
    private func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                avatarSceneView

                TVMagicMirrorGreetingCard(greeting: greeting)

                TVMagicMirrorVocabularyCard(greeting: greeting)

                TVMagicMirrorRefreshButton(isFocused: $refreshButtonFocused) {
                    loadGreeting()
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(message)
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .multilineTextAlignment(.center)

            TVMagicMirrorRefreshButton(isFocused: $refreshButtonFocused) {
                loadGreeting()
            }
        }
    }

    @ViewBuilder
    private var avatarSceneView: some View {
        if let glbData = glbData {
            MagicMirrorAvatarSceneView(glbData: glbData)
                .frame(height: 320)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
        } else if meshLoadFailed {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bgMedium.opacity(0.3))
                .frame(height: 320)
                .overlay {
                    VStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "person.crop.circle")
                            .font(.system(size: 60))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(localization.t("zehAni.magicMirror.meshUnavailable"))
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
        } else {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bgMedium.opacity(0.3))
                .frame(height: 320)
                .overlay {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(1.5)
                }
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
        }
    }

    private func loadGreeting() {
        isLoading = true
        error = nil
        glbData = nil
        meshLoadFailed = false
        NSLog("BAYIT_TV_MM loadGreeting start profileId=\(profileId)")

        Task {
            do {
                async let greetingTask = repos.avatarMeshRepository.getMagicMirrorGreeting(
                    profileId: profileId
                )
                async let avatarsTask = repos.starStory.fetchAvatars(profileId: profileId)

                let fetched = try await greetingTask
                let avatarsResponse = try? await avatarsTask
                let avatarId = avatarsResponse?.avatars.first?.avatarId
                NSLog("BAYIT_TV_MM greeting ok, avatarId=\(avatarId ?? "nil"), avatarsCount=\(avatarsResponse?.avatars.count ?? 0)")

                await MainActor.run {
                    greeting = fetched
                    existingAvatarId = avatarId
                    isLoading = false
                }

                if let avatarId {
                    await loadAvatarMesh(avatarId: avatarId)
                } else {
                    NSLog("BAYIT_TV_MM no avatarId, meshLoadFailed")
                    await MainActor.run { meshLoadFailed = true }
                }
            } catch {
                NSLog("BAYIT_TV_MM loadGreeting error: \(error.localizedDescription)")
                await MainActor.run {
                    self.error = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }

    private func loadAvatarMesh(avatarId: String) async {
        NSLog("BAYIT_TV_MM loadAvatarMesh start avatarId=\(avatarId)")
        do {
            let meshGlb = try await repos.avatarMeshRepository.fetchGlbUrl(
                avatarId: avatarId
            )
            NSLog("BAYIT_TV_MM fetchGlbUrl ok, url=\(meshGlb.signedUrl)")

            guard let url = URL(string: meshGlb.signedUrl) else {
                NSLog("BAYIT_TV_MM invalid URL")
                await MainActor.run { meshLoadFailed = true }
                return
            }

            let (data, response) = try await URLSession.shared.data(from: url)
            let httpStatus = (response as? HTTPURLResponse)?.statusCode ?? 0
            let isValidGlb = (httpStatus == 200 || httpStatus == 0) && data.count > 50_000
            NSLog("BAYIT_TV_MM meshDownload status=\(httpStatus) size=\(data.count) valid=\(isValidGlb)")

            await MainActor.run {
                if isValidGlb {
                    glbData = data
                    NSLog("BAYIT_TV_MM glbData set successfully")
                } else {
                    meshLoadFailed = true
                    NSLog("BAYIT_TV_MM validation failed")
                }
            }
        } catch {
            NSLog("BAYIT_TV_MM loadAvatarMesh error: \(error.localizedDescription)")
            await MainActor.run { meshLoadFailed = true }
        }
    }
}
#endif
