import SwiftUI

/// Root view handling navigation between all screens
struct AppRootView: View {
    @StateObject private var coordinator = AppCoordinator()

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            switch coordinator.currentScreen {
            case .loading:
                LoadingView()

            case .onboarding:
                OnboardingView(coordinator: coordinator)

            case .permissions:
                PermissionsView(coordinator: coordinator)

            case .main:
                MainMenuView(coordinator: coordinator)

            case .session:
                ActiveSessionView(coordinator: coordinator)

            case .settings:
                EnhancedSettingsView(coordinator: coordinator)

            case .bluetoothPairing:
                BluetoothPairingView(coordinator: coordinator)

            case .languageSelection:
                LanguageSelectionView(coordinator: coordinator)

            case .sessionHistory:
                SessionHistoryView(coordinator: coordinator)
            }
        }
        .environmentObject(coordinator)
    }
}

// MARK: - Loading View
struct LoadingView: View {
    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "waveform.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.white)
                .scaleEffect(isAnimating ? 1.2 : 1.0)
                .animation(
                    .easeInOut(duration: 1.0)
                        .repeatForever(autoreverses: true),
                    value: isAnimating
                )

            Text("Omen")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundColor(.white)

            Text("Real-Time Translation")
                .font(.title3)
                .foregroundColor(.white.opacity(0.7))
        }
        .onAppear {
            isAnimating = true
        }
    }
}
