import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

/// Landing view after scanning a tvOS avatar pairing QR code.
/// Notifies the TV that the phone connected, then launches avatar creation.
struct AvatarPairingLandingView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let sessionId: String

    @State private var profileId: String?
    @State private var showCreation = false
    @State private var didNotifyScan = false
    @State private var completed = false
    @State private var errorMessage: String?

    private let logger = BayitLogger(category: "AvatarPairing")

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                content
            }
            .navigationTitle(localization.t("zehAni.pairing.mobileLanding"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .task { await notifyScan() }
            .sheet(isPresented: $showCreation) {
                if let profileId {
                    AvatarCreationView(
                        profileId: profileId,
                        viewModel: StarStoryViewModel(repository: repos.starStory),
                        pairingSessionId: sessionId
                    )
                }
            }
            .onChange(of: showCreation) { _, showing in
                if !showing, completed { dismiss() }
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if completed {
            completedContent
        } else if let error = errorMessage {
            errorContent(error)
        } else {
            landingContent
        }
    }

    private var landingContent: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "tv.and.mediabox")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("zehAni.pairing.mobileLanding"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("zehAni.pairing.mobileLandingDesc"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
            GlassButton(
                localization.t("common.start"),
                variant: .primary,
                size: .large,
                icon: Image(systemName: "video.fill")
            ) {
                showCreation = true
            }
            .disabled(profileId == nil)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var completedContent: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Colors.Semantic.success)
            Text(localization.t("zehAni.pairing.sentToTV"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            GlassButton(
                localization.t("common.done"),
                variant: .primary,
                size: .large
            ) { dismiss() }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func errorContent(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Colors.Semantic.error)
            Text(message)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func notifyScan() async {
        guard !didNotifyScan else { return }
        didNotifyScan = true
        do {
            struct ScanResponse: Decodable {
                let status: String
            }
            _ = try await repos.apiClient.post(
                "zeh-ani/avatar/pairing/\(sessionId)/scan",
                body: [:] as [String: String],
                as: ScanResponse.self
            )
            let profile = try await repos.user.fetchProfile()
            profileId = profile.id
            logger.info("Pairing scan notified, profile: \(profileId ?? "none")")
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to notify pairing scan", error: error)
        }
    }
}
