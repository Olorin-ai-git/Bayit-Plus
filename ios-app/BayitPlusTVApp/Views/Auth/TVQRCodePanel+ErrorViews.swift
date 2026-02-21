import BayitAuth
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import CoreImage.CIFilterBuiltins
import SwiftUI
import UIKit

// MARK: - TVQRCodePanel Error, Expired & QR Code Image

extension TVQRCodePanel {
    func errorSection(_ vm: TVQRAuthViewModel) -> some View {
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
                    localization.t("tvLogin.tryAgain"),
                    variant: .primary,
                    size: .large,
                    icon: Image(systemName: "arrow.clockwise")
                ) {
                    errorMessage = nil
                    Task { await vm.retry() }
                }
            }
        }
    }

    func expiredSection(_ vm: TVQRAuthViewModel) -> some View {
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
                    localization.t("tvLogin.generateNewCode"),
                    variant: .primary,
                    size: .large,
                    icon: Image(systemName: "qrcode")
                ) {
                    errorMessage = nil
                    Task { await vm.retry() }
                }
            }
        }
    }

    /// Generates a QR code image from a string using CoreImage.
    /// Pattern reused from BayitPlusApp/Views/Settings/DevicePairingView.swift.
    func qrCodeImage(for string: String) -> Image {
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
