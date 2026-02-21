import BayitAuth
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import CoreImage.CIFilterBuiltins
import SwiftUI
import UIKit

/// Right panel of the tvOS split-screen sign-in.
/// Displays a QR code for companion device authentication with status indicators.
struct TVQRCodePanel: View {
    @Environment(AuthManager.self) var authManager
    @Environment(LocalizationManager.self) var localization

    let onAuthSuccess: () -> Void
    let logger: APILogger
    @Binding var errorMessage: String?

    @State var viewModel: TVQRAuthViewModel?

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            headerSection

            if let vm = viewModel {
                statusContent(vm)
            } else {
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.5)
            }
        }
        .padding(TVDesignTokens.Spacing.xxxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task {
            if viewModel == nil {
                errorMessage = nil // Clear any existing errors
                let vm = TVQRAuthViewModel(
                    authManager: authManager,
                    logger: logger
                )
                viewModel = vm
                await vm.initSession()

                if let qrData = vm.qrCodeData {
                    logger.debug(
                        "QR code pairing URL generated",
                        metadata: [
                            "url_prefix": String(qrData.prefix(40)),
                        ]
                    )
                }
            }
        }
        .onChange(of: viewModel?.status) { _, newValue in
            switch newValue {
            case .authenticated:
                onAuthSuccess()
            case .failed:
                if let error = viewModel?.error {
                    errorMessage = error
                }
            case .waitingForScan, .companionConnected, .authenticating:
                // Clear error when user takes action or progresses
                errorMessage = nil
            default:
                break
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("tvLogin.qrTitle"))
                .font(.system(
                    size: TVDesignTokens.FontSize.xxl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("tvLogin.qrSubtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            // Value proposition badge
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Colors.Primary.light)
                Text(localization.t("tvLogin.fastestWayToSignIn"))
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(
                Capsule()
                    .fill(DesignTokens.Colors.Primary.base.opacity(0.15))
                    .overlay(
                        Capsule()
                            .stroke(DesignTokens.Colors.Primary.base.opacity(0.3), lineWidth: 1)
                    )
            )
            .padding(.top, TVDesignTokens.Spacing.sm)
        }
    }

    // MARK: - Status Content

    @ViewBuilder
    func statusContent(_ vm: TVQRAuthViewModel) -> some View {
        switch vm.status {
        case .idle, .loading:
            ProgressView()
                .tint(.white)
                .scaleEffect(1.5)

        case .waitingForScan:
            qrCodeSection(vm)

        case .companionConnected:
            companionConnectedSection

        case .authenticating:
            authenticatingSection

        case .authenticated:
            successSection

        case .failed:
            errorSection(vm)

        case .expired:
            expiredSection(vm)
        }
    }
}
