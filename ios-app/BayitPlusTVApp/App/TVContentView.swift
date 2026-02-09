import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Root content view for the tvOS app.
/// Shows auth flow when not authenticated, main tab view otherwise.
struct TVContentView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        ZStack {
            DesignTokens.Colors.Background.primary
                .ignoresSafeArea()

            if coordinator.showingAuth {
                TVAuthView(
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
        .animation(.easeInOut, value: coordinator.showingAuth)
    }
}
