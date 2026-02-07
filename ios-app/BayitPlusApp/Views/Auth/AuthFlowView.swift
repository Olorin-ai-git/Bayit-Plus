import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Authentication flow: Login -> Register -> Profile Selection
struct AuthFlowView: View {
    @State private var authStep: AuthStep = .login
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager

    enum AuthStep {
        case login
        case register
        case profileSelection
    }

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

            switch authStep {
            case .login:
                LoginView(
                    onRegister: {
                        withAnimation { authStep = .register }
                    },
                    onLoginSuccess: {
                        withAnimation { authStep = .profileSelection }
                    }
                )
                .transition(.asymmetric(
                    insertion: .move(edge: .leading),
                    removal: .move(edge: .trailing)
                ))

            case .register:
                RegisterView(
                    onBack: {
                        withAnimation { authStep = .login }
                    },
                    onRegisterSuccess: {
                        withAnimation { authStep = .profileSelection }
                    }
                )
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing),
                    removal: .move(edge: .leading)
                ))

            case .profileSelection:
                ProfileSelectionView(
                    onProfileSelected: {
                        coordinator.showingAuth = false
                    }
                )
                .transition(.scale(scale: 0.9).combined(with: .opacity))
            }
        }
    }
}
