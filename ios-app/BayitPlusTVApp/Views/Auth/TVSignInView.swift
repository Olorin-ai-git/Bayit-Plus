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

            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Spacer()
                    .frame(height: 20)

                logoHeader

                HStack(alignment: .top, spacing: 0) {
                    TVCredentialPanel(onAuthSuccess: onAuthSuccess)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .focusSection()

                    glassDivider

                    TVQRCodePanel(onAuthSuccess: onAuthSuccess, logger: logger)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .focusSection()
                }
            }
            .padding(.top, 20)
            .padding(.bottom, 40)
        }
    }

    // MARK: - Logo

    private var logoHeader: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            if let logoImage = UIImage(named: "logo")
                ?? loadBundleLogo() {
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
              let data = try? Data(contentsOf: url) else {
            return nil
        }
        return UIImage(data: data)
    }
}
