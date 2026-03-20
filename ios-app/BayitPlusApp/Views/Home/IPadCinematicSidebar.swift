import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sidebar navigation for iPad cinematic home.
/// Replaces the floating dock on regular-width devices.
struct IPadCinematicSidebar: View {
    let showContinueWatching: Bool
    let showPlex: Bool
    let showYouTube: Bool
    let onNavigate: (CinematicDockItem) -> Void

    @Environment(LocalizationManager.self) private var localization

    private var items: [CinematicDockItem] {
        var result: [CinematicDockItem] = [.discover, .liveTV, .listen]
        if showContinueWatching { result.append(.continueWatching) }
        if showPlex { result.append(.plex) }
        if showYouTube { result.append(.youtube) }
        return result
    }

    var body: some View {
        VStack(spacing: 0) {
            logoHeader
            Divider().background(Color.white.opacity(0.1))
            navigationItems
            Spacer()
        }
        .frame(width: 240)
        .background(sidebarBackground)
    }

    // MARK: - Logo

    private var logoHeader: some View {
        HStack {
            Image(systemName: "house.fill")
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.default)
            Text(localization.t("home.title"))
                .font(.system(
                    size: DesignTokens.FontSize.lg,
                    weight: .bold
                ))
                .foregroundStyle(.white)
            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.xl)
    }

    // MARK: - Navigation Items

    private var navigationItems: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(items) { item in
                sidebarButton(item)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.top, DesignTokens.Spacing.lg)
    }

    private func sidebarButton(_ item: CinematicDockItem) -> some View {
        Button {
            onNavigate(item)
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: iconName(for: item))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .frame(width: 24)
                Text(label(for: item))
                    .font(.system(
                        size: DesignTokens.FontSize.md,
                        weight: .medium
                    ))
                Spacer()
            }
            .foregroundStyle(.white.opacity(0.8))
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(Color.white.opacity(0.05))
            .clipShape(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            )
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

    // MARK: - Background

    private var sidebarBackground: some View {
        ZStack {
            Color.black.opacity(0.85)
            DesignTokens.Primary.p900.opacity(0.15)
        }
        .background(.ultraThinMaterial)
    }
}
