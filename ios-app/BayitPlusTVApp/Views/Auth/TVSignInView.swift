import BayitAuth
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI
import UIKit

/// Split-screen sign-in view for tvOS.
///
/// Left panel: email/password + Apple Sign-In (credential-based).
/// Right panel: QR code for companion device authentication.
/// A glass vertical divider separates the two panels.
struct TVSignInView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization

    let onAuthSuccess: () -> Void
    let logger: APILogger

    @Namespace private var credentialSection
    @Namespace private var qrSection
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    DesignTokens.Colors.Background.primary,
                    Color.black,
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.md) {
                logoHeader
                    .padding(.top, TVDesignTokens.Spacing.xxl)

                // Error banner between logo and content
                if let errorMessage {
                    errorBanner(message: errorMessage)
                }

                HStack(alignment: .top, spacing: 0) {
                    TVCredentialPanel(
                        onAuthSuccess: onAuthSuccess,
                        errorMessage: $errorMessage
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .focusSection()

                    glassDivider

                    TVQRCodePanel(
                        onAuthSuccess: onAuthSuccess,
                        logger: logger,
                        errorMessage: $errorMessage
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .focusSection()
                }
            }
            .padding(.top, TVDesignTokens.Spacing.xxxxl)
            .padding(.bottom, TVDesignTokens.Spacing.lg)
            .edgesIgnoringSafeArea([])
        }
    }

    // MARK: - Logo

    private var logoHeader: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            if let logoImage = UIImage(named: "logo")
                ?? loadBundleLogo()
            {
                Image(uiImage: logoImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(
                        width: TVDesignTokens.Logo.width,
                        height: TVDesignTokens.Logo.height
                    )
            }

            (Text(localization.t("splash.bayit"))
                .foregroundColor(.white)
                + Text(localization.t("splash.plus"))
                .foregroundColor(DesignTokens.Colors.Primary.base))
                .font(.system(
                    size: TVDesignTokens.FontSize.xxxl,
                    weight: .bold
                ))
        }
    }

    // MARK: - Error Banner

    private func errorBanner(message: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Colors.Semantic.error)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(.white)
                .lineLimit(2)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
        .background(
            Capsule()
                .fill(DesignTokens.Colors.Semantic.error.opacity(0.9))
                .overlay(
                    Capsule()
                        .stroke(DesignTokens.Colors.Semantic.error, lineWidth: 1)
                )
        )
        .shadow(
            color: DesignTokens.Colors.Semantic.error.opacity(0.5),
            radius: 10,
            x: 0,
            y: 4
        )
        .transition(.move(edge: .top).combined(with: .opacity))
        .animation(.spring(response: 0.3), value: errorMessage)
    }

    // MARK: - Divider

    private var glassDivider: some View {
        Rectangle()
            .fill(DesignTokens.Glass.border)
            .frame(width: 1)
            .padding(.vertical, TVDesignTokens.Spacing.xxxl)
    }

    // MARK: - Helpers

    private func loadBundleLogo() -> UIImage? {
        guard let url = Bundle.main.url(
            forResource: "logo", withExtension: "png"
        ),
            let data = try? Data(contentsOf: url)
        else {
            return nil
        }
        return UIImage(data: data)
    }
}
