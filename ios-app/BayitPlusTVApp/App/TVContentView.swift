import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Root content view for the tvOS app.
/// Shows splash on first launch, then auth flow or main tab view.
struct TVContentView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        ZStack {
            DesignTokens.Colors.Background.primary
                .ignoresSafeArea()

            if coordinator.showingSplash {
                TVSplashView(
                    onFinished: {
                        withAnimation(.easeInOut(duration: 0.5)) {
                            coordinator.showingSplash = false
                        }
                    }
                )
                .transition(.opacity)
            } else if coordinator.showingAuth {
                TVSignInView(
                    onAuthSuccess: {
                        withAnimation {
                            coordinator.showingAuth = false
                        }
                    }
                )
                .transition(.opacity)
            } else {
                TVMainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut, value: coordinator.showingSplash)
        .animation(.easeInOut, value: coordinator.showingAuth)
    }
}
