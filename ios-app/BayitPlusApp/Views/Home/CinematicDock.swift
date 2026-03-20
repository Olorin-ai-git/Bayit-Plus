import BayitDesignSystem
import BayitLocalization
import SwiftUI

enum CinematicDockItem: String, Identifiable, CaseIterable {
    case discover
    case liveTV
    case listen
    case continueWatching
    case plex
    case youtube

    var id: String {
        rawValue
    }
}

/// Floating glass dock for cinematic home navigation on iPhone.
/// Auto-hides after 4 seconds, revealed by swipe up or tap.
struct CinematicDock: View {
    let showContinueWatching: Bool
    let showPlex: Bool
    let showYouTube: Bool
    let scrollProgress: CGFloat
    let onNavigate: (CinematicDockItem) -> Void

    @Environment(LocalizationManager.self) private var localization
    @State private var isVisible = true
    @State private var hideTask: Task<Void, Never>?

    private var visibleItems: [CinematicDockItem] {
        var items: [CinematicDockItem] = [.discover, .liveTV, .listen]
        if showContinueWatching { items.append(.continueWatching) }
        if showPlex { items.append(.plex) }
        if showYouTube { items.append(.youtube) }
        return items
    }

    var body: some View {
        dockPill
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)
            .animation(.easeInOut(duration: 0.3), value: isVisible)
            .padding(.bottom, DesignTokens.Spacing.lg)
            .accessibilityElement(children: .contain)
            .accessibilityLabel(localization.t("cinematic.a11y.dock"))
            .accessibilityHidden(false)
            .onAppear { scheduleHide() }
            .onDisappear { hideTask?.cancel() }
            .onChange(of: scrollProgress) { _, progress in
                if progress < 0.05 { revealDock() }
            }
    }

    // MARK: - Dock Pill

    private var dockPill: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            ForEach(visibleItems) { item in
                dockButton(item)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
        .background(pillBackground)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.15),
                            Color.white.opacity(0.05),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    lineWidth: 0.5
                )
        )
    }

    private var pillBackground: some View {
        ZStack {
            Color.black.opacity(0.72)
            DesignTokens.Primary.p900.opacity(0.25)
        }
        .background(.ultraThinMaterial)
    }

    // MARK: - Dock Button

    private func dockButton(_ item: CinematicDockItem) -> some View {
        Button {
            onNavigate(item)
        } label: {
            VStack(spacing: 4) {
                Image(systemName: iconName(for: item))
                    .font(.system(size: 18))
                    .frame(width: 44, height: 44)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Circle())
                Text(label(for: item))
                    .font(.system(
                        size: DesignTokens.FontSize.xs,
                        weight: .medium
                    ))
                    .lineLimit(1)
            }
            .foregroundStyle(.white)
            .frame(width: 56)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            localization.t(
                "cinematic.a11y.dockItem",
                ["name": label(for: item)]
            )
        )
    }

    // MARK: - Item Config

    private func iconName(for item: CinematicDockItem) -> String {
        switch item {
        case .discover: return "sparkle.magnifyingglass"
        case .liveTV: return "tv"
        case .listen: return "headphones"
        case .continueWatching: return "play.circle"
        case .plex: return "server.rack"
        case .youtube: return "play.rectangle.fill"
        }
    }

    private func label(for item: CinematicDockItem) -> String {
        switch item {
        case .discover: return localization.t("dock.discover")
        case .liveTV: return localization.t("dock.liveTV")
        case .listen: return localization.t("dock.listen")
        case .continueWatching:
            return localization.t("dock.continueWatching")
        case .plex: return localization.t("dock.plex")
        case .youtube: return localization.t("dock.youtube")
        }
    }

    // MARK: - Auto-Hide

    private func scheduleHide() {
        hideTask?.cancel()
        hideTask = Task { @MainActor in
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            isVisible = false
        }
    }

    func revealDock() {
        isVisible = true
        scheduleHide()
    }
}
