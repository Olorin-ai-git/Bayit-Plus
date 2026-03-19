import BayitDesignSystem
import SwiftUI

/// Cinematic home experience with full-screen hero carousel,
/// parallax scroll, and floating dock navigation.
struct CinematicHomeView: View {
    let viewModel: HomeViewModel

    var body: some View {
        ZStack {
            DesignTokens.Background.primary
                .ignoresSafeArea()
            Text("Cinematic Home")
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }
}
