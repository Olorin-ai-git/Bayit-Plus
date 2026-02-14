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
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization

    let onAuthSuccess: () -> Void

    let logger: APILogger

    @State private var viewModel: TVQRAuthViewModel?

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
                let vm = TVQRAuthViewModel(
                    authManager: authManager,
                    logger: logger
                )
                viewModel = vm
                await vm.initSession()
            }
        }
        .onChange(of: viewModel?.status) { _, newValue in
            if newValue == .authenticated {
                onAuthSuccess()
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("tvLogin.qrTitle"))
                .font(.system(
                    size: TVDesignTokens.FontSize.xxl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("tvLogin.qrSubtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Status Content

    @ViewBuilder
    private func statusContent(_ vm: TVQRAuthViewModel) -> some View {
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

    // MARK: - QR Code

    private func qrCodeSection(_ vm: TVQRAuthViewModel) -> some View {
        GlassCard(
            radius: TVDesignTokens.Radius.lg,
            padding: TVDesignTokens.Spacing.xl
        ) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                if let code = vm.qrCodeData {
                    qrCodeImage(for: code)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(
                            width: TVDesignTokens.QRCode.size,
                            height: TVDesignTokens.QRCode.size
                        )
                        .clipShape(RoundedRectangle(
                            cornerRadius: TVDesignTokens.Radius.md
                        ))
                        .background(
                            RoundedRectangle(
                                cornerRadius: TVDesignTokens.Radius.md
                            )
                            .fill(.white)
                            .padding(-TVDesignTokens.Spacing.sm)
                        )
                        .accessibilityLabel(
                            "QR code for device pairing. Scan with your phone to sign in."
                        )
                }

                Text(localization.t("tvLogin.scanWithPhone"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.base,
                        weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - Status Views

    private var companionConnectedSection: some View {
        GlassCard(
            radius: TVDesignTokens.Radius.lg,
            padding: TVDesignTokens.Spacing.xl
        ) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "iphone.and.arrow.forward")
                    .font(.system(size: TVDesignTokens.FontSize.display))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .symbolEffect(.pulse)
                    .accessibilityLabel(localization.t("tvLogin.phoneConnected"))

                Text(localization.t("tvLogin.phoneConnected"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("tvLogin.completeOnPhone"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
    }

    private var authenticatingSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView()
                .tint(.white)
                .scaleEffect(1.5)

            Text(localization.t("tvLogin.signingIn"))
                .font(.system(
                    size: TVDesignTokens.FontSize.lg,
                    weight: .medium
                ))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var successSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Colors.Semantic.success)
                .accessibilityLabel(localization.t("tvLogin.signedIn"))

            Text(localization.t("tvLogin.signedIn"))
                .font(.system(
                    size: TVDesignTokens.FontSize.lg,
                    weight: .semibold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private func errorSection(_ vm: TVQRAuthViewModel) -> some View {
        GlassCard(
            radius: TVDesignTokens.Radius.lg,
            padding: TVDesignTokens.Spacing.xl
        ) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: TVDesignTokens.FontSize.display))
                    .foregroundStyle(DesignTokens.Colors.Semantic.error)
                    .accessibilityLabel("Error")

                if let errorText = vm.error {
                    Text(errorText)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)
                }

                GlassButton(
                    "Try Again",
                    variant: .primary,
                    size: .large,
                    icon: Image(systemName: "arrow.clockwise")
                ) {
                    Task { await vm.retry() }
                }
            }
        }
    }

    private func expiredSection(_ vm: TVQRAuthViewModel) -> some View {
        GlassCard(
            radius: TVDesignTokens.Radius.lg,
            padding: TVDesignTokens.Spacing.xl
        ) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "clock.badge.exclamationmark")
                    .font(.system(size: TVDesignTokens.FontSize.display))
                    .foregroundStyle(DesignTokens.Colors.Semantic.warning)
                    .accessibilityLabel(localization.t("tvLogin.qrExpired"))

                Text(localization.t("tvLogin.qrExpired"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                GlassButton(
                    "Generate New Code",
                    variant: .primary,
                    size: .large,
                    icon: Image(systemName: "qrcode")
                ) {
                    Task { await vm.retry() }
                }
            }
        }
    }

    // MARK: - QR Code Generation

    /// Generates a QR code image from a string using CoreImage.
    /// Pattern reused from BayitPlusApp/Views/Settings/DevicePairingView.swift.
    private func qrCodeImage(for string: String) -> Image {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"

        guard let outputImage = filter.outputImage else {
            return Image(systemName: "qrcode")
        }

        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaledImage = outputImage.transformed(by: transform)

        guard let cgImage = context.createCGImage(
            scaledImage, from: scaledImage.extent
        ) else {
            return Image(systemName: "qrcode")
        }

        return Image(uiImage: UIImage(cgImage: cgImage))
    }
}
