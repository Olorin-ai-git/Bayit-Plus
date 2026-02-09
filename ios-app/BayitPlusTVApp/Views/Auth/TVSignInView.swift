import BayitAuth
import BayitDesignSystem
import SwiftUI
import UIKit

/// Split-screen sign-in view for tvOS.
///
/// Left panel: email/password + Apple Sign-In (credential-based).
/// Right panel: QR code for companion device authentication.
/// A glass vertical divider separates the two panels.
struct TVSignInView: View {
    @Environment(AuthManager.self) private var authManager

    let onAuthSuccess: () -> Void

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

            VStack(spacing: TVDesignTokens.Spacing.xl) {
                logoHeader

                HStack(spacing: 0) {
                    TVCredentialPanel(onAuthSuccess: onAuthSuccess)
                        .frame(maxWidth: .infinity)

                    glassDivider

                    TVQRCodePanel(onAuthSuccess: onAuthSuccess)
                        .frame(maxWidth: .infinity)
                }
                .frame(maxHeight: .infinity)
            }
            .padding(.top, TVDesignTokens.Spacing.xl)
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
                    .frame(width: 160, height: 80)
            }

            (Text("Bayit")
                .foregroundColor(.white)
            + Text("+")
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
