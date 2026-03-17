#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Navigation destinations for the homepage dock buttons.
    enum HomeDockDestination {
        case discover
        case liveTV
        case listen
        case continueWatching
        case plex
        case youtube
    }

    /// Glass capsule dock anchored at the bottom of the cinematic homepage.
    /// Matches the visual language of TVQuickDockView (circular icon buttons,
    /// frosted glass container, purple ring focus).
    struct TVHomeDock: View {
        let showContinueWatching: Bool
        let showPlex: Bool
        let showYouTube: Bool
        let onNavigate: (HomeDockDestination) -> Void

        @Environment(LocalizationManager.self) private var localization
        @FocusState private var focusedItem: HomeDockDestination?

        private var visibleItems: [HomeDockDestination] {
            var items: [HomeDockDestination] = [.discover, .liveTV, .listen]
            if showContinueWatching { items.append(.continueWatching) }
            if showPlex { items.append(.plex) }
            if showYouTube { items.append(.youtube) }
            return items
        }

        var body: some View {
            dockPill
        }

        // MARK: - Pill Shell

        private var dockPill: some View {
            HStack(spacing: 8) {
                ForEach(visibleItems, id: \.self) { item in
                    dockButton(item: item)
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background { pillBackground }
            .clipShape(Capsule())
            .overlay(pillBorder)
            .shadow(color: .black.opacity(0.5), radius: 40, x: 0, y: 16)
        }

        // MARK: - Dock Button

        private func dockButton(item: HomeDockDestination) -> some View {
            let isFocused = focusedItem == item
            return Button {
                onNavigate(item)
            } label: {
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(
                                isFocused
                                    ? Color.white.opacity(0.18)
                                    : Color.white.opacity(0.08)
                            )
                            .frame(width: 72, height: 72)
                            .overlay(
                                Circle().strokeBorder(
                                    isFocused
                                        ? DesignTokens.Primary.p400.opacity(0.6)
                                        : Color.white.opacity(0.12),
                                    lineWidth: 1.5
                                )
                            )

                        Image(systemName: iconName(for: item))
                            .font(.system(size: 28, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }

                    Text(label(for: item))
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                        .frame(width: 90)
                }
            }
            .buttonStyle(.plain)
            .focused($focusedItem, equals: item)
            .scaleEffect(isFocused ? 1.08 : 1.0)
            .animation(
                .spring(duration: 0.2, bounce: 0.3),
                value: isFocused
            )
        }

        // MARK: - Item Config

        private func iconName(for item: HomeDockDestination) -> String {
            switch item {
            case .discover: return "sparkles"
            case .liveTV: return "play.tv"
            case .listen: return "headphones"
            case .continueWatching: return "play.circle"
            case .plex: return "server.rack"
            case .youtube: return "play.rectangle.fill"
            }
        }

        private func label(for item: HomeDockDestination) -> String {
            switch item {
            case .discover:
                return localization.t("nav.discover")
            case .liveTV:
                return localization.t("nav.liveTV")
            case .listen:
                return localization.t("nav.listen")
            case .continueWatching:
                return localization.t("home.continueWatching")
            case .plex:
                return localization.t("byoc.plex")
            case .youtube:
                return localization.t("byoc.youtube")
            }
        }

        // MARK: - Visual Chrome

        private var pillBackground: some View {
            ZStack {
                Color.black.opacity(0.72)
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .dark)
                LinearGradient(
                    colors: [
                        DesignTokens.Primary.p900.opacity(0.25),
                        Color.clear,
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }

        private var pillBorder: some View {
            Capsule()
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.18),
                            Color.white.opacity(0.06),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        }
    }
#endif
