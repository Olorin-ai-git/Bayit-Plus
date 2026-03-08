import BayitMedia
import SwiftUI

/// Keyboard shortcuts for iPad with hardware keyboard attached.
/// Applied to IPadMainView to enable power-user navigation.
struct IPadKeyboardShortcuts: ViewModifier {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(MediaPlayer.self) private var mediaPlayer

    func body(content: Content) -> some View {
        content
            .background {
                shortcutButtons
            }
    }

    private var shortcutButtons: some View {
        Group {
            Button("") { coordinator.selectedTab = .home; coordinator.popToRoot() }
                .keyboardShortcut("1", modifiers: .command)

            Button("") { coordinator.selectedTab = .liveTV; coordinator.popToRoot() }
                .keyboardShortcut("2", modifiers: .command)

            Button("") { coordinator.selectedTab = .vod; coordinator.popToRoot() }
                .keyboardShortcut("3", modifiers: .command)

            Button("") { coordinator.selectedTab = .zehAni; coordinator.popToRoot() }
                .keyboardShortcut("4", modifiers: .command)

            Button("") { coordinator.selectedTab = .podcasts; coordinator.popToRoot() }
                .keyboardShortcut("5", modifiers: .command)

            Button("") { coordinator.selectedTab = .search; coordinator.popToRoot() }
                .keyboardShortcut("6", modifiers: .command)

            Button("") { coordinator.selectedTab = .downloads; coordinator.popToRoot() }
                .keyboardShortcut("7", modifiers: .command)

            Button("") { coordinator.navigate(to: .search) }
                .keyboardShortcut("f", modifiers: .command)

            Button("") { coordinator.navigate(to: .settings) }
                .keyboardShortcut(",", modifiers: .command)

            Button("") { togglePlayback() }
                .keyboardShortcut(.space, modifiers: [])
        }
        .frame(width: 0, height: 0)
        .opacity(0)
        .accessibilityHidden(true)
    }

    private func togglePlayback() {
        if mediaPlayer.state == .playing {
            mediaPlayer.pause()
        } else {
            mediaPlayer.play()
        }
    }
}

extension View {
    func iPadKeyboardShortcuts() -> some View {
        modifier(IPadKeyboardShortcuts())
    }
}
