import BayitAuth
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import CoreImage.CIFilterBuiltins
import SwiftUI
import UIKit

// MARK: - TVQRCodePanel Status & QR Code Views

extension TVQRCodePanel {
    func qrCodeSection(_ vm: TVQRAuthViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                if let code = vm.qrCodeData {
                    qrCodeImage(for: code)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(
                            width: TVDesignTokens.QRCode.size * 1.3,
                            height: TVDesignTokens.QRCode.size * 1.3
                        )
                        .clipShape(RoundedRectangle(
                            cornerRadius: TVDesignTokens.Radius.lg
                        ))
                        .background(
                            RoundedRectangle(
                                cornerRadius: TVDesignTokens.Radius.lg
                            )
                            .fill(.white)
                            .padding(-TVDesignTokens.Spacing.md)
                        )
                        .shadow(
                            color: DesignTokens.Colors.Primary.base.opacity(0.3),
                            radius: 20,
                            x: 0,
                            y: 10
                        )
                        .accessibilityLabel(
                            "QR code for device pairing. Scan with your phone to sign in."
                        )
                }

                VStack(spacing: TVDesignTokens.Spacing.sm) {
                    Text(localization.t("tvLogin.scanToContinue"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.lg,
                            weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("tvLogin.allMethodsSupported"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .background {
            ZStack {
                Color.black.opacity(0.4)
                VisualEffectBlur()
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(
                    LinearGradient(
                        colors: [
                            DesignTokens.Colors.Primary.base.opacity(0.3),
                            DesignTokens.Glass.border.opacity(0.5),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .shadow(
            color: DesignTokens.Colors.Primary.base.opacity(0.2),
            radius: 15,
            x: 0,
            y: 8
        )
    }

    var companionConnectedSection: some View {
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

    var authenticatingSection: some View {
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

    var successSection: some View {
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
}
