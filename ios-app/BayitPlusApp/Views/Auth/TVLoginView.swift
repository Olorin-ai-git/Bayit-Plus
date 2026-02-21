import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

/// View displayed when user scans a TV login QR code.
/// Handles the device pairing authentication flow.
struct TVLoginView: View {
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(AuthManager.self) var authManager
    @Environment(LocalizationManager.self) var localization
    @Environment(RepositoryProvider.self) var repos

    let sessionId: String
    let token: String
    let expires: String

    @State var status: PairingStatus = .idle
    @State var errorMessage: String?

    let logger = BayitLogger(category: "TVLogin")

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                headerSection

                statusContent

                Spacer()
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .navigationTitle(localization.t("tvLogin.title"))
        .task {
            await verifyAndConnect()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "tv.and.hifispeaker.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Primary.p400)
                .symbolEffect(.bounce, value: status)

            Text(localization.t("tvLogin.header"))
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("tvLogin.subtitle"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, DesignTokens.Spacing.xl)
    }

    // MARK: - Status Content

    @ViewBuilder
    private var statusContent: some View {
        switch status {
        case .idle, .loading:
            loadingSection

        case .waitingForScan:
            EmptyView()

        case .companionConnected:
            connectedSection

        case .authenticating:
            authenticatingSection

        case .authenticated:
            successSection

        case .failed:
            errorSection

        case .expired:
            expiredSection
        }
    }

    private var loadingSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Primary.p400)
                .scaleEffect(1.2)

            Text(localization.t("tvLogin.verifying"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.vertical, DesignTokens.Spacing.xl)
    }
}
