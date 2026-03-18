#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Navigation destinations for the homepage dock buttons.
    enum HomeDockDestination: Identifiable {
        var id: String {
            String(describing: self)
        }

        case liveAI
        case movieAI
        case zehAni
        case continueWatching
        case plex
        case youtube
        case toggleView
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
            var items: [HomeDockDestination] = [
                .liveAI, .movieAI, .zehAni,
            ]
            if showContinueWatching { items.append(.continueWatching) }
            if showPlex { items.append(.plex) }
            if showYouTube { items.append(.youtube) }
            items.append(.toggleView)
            return items
        }

        var body: some View {
            dockPill
                .focusSection()
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
                                        ? DesignTokens.Primary.p400
                                        : restRingColor(for: item),
                                    lineWidth: isFocused ? 2.5 : 1.5
                                )
                            )
                            .shadow(
                                color: isFocused
                                    ? DesignTokens.Glass.purpleGlow : .clear,
                                radius: 12, x: 0, y: 4
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
            .buttonStyle(DockItemButtonStyle())
            .focused($focusedItem, equals: item)
            .scaleEffect(isFocused ? 1.1 : 1.0)
            .animation(.spring(duration: 0.2), value: isFocused)
        }

        // MARK: - Item Config

        private func iconName(for item: HomeDockDestination) -> String {
            switch item {
            case .liveAI: return "waveform.badge.mic"
            case .movieAI: return "sparkles.rectangle.stack"
            case .zehAni: return "person.crop.rectangle.stack"
            case .continueWatching: return "play.circle"
            case .plex: return "server.rack"
            case .youtube: return "play.rectangle.fill"
            case .toggleView: return "rectangle.stack"
            }
        }

        private func label(for item: HomeDockDestination) -> String {
            switch item {
            case .liveAI:
                return localization.t("dock.liveAI")
            case .movieAI:
                return localization.t("dock.movieAI")
            case .zehAni:
                return localization.t("nav.zehAni")
            case .continueWatching:
                return localization.t("home.continueWatching")
            case .plex:
                return localization.t("byoc.plex")
            case .youtube:
                return localization.t("byoc.youtube")
            case .toggleView:
                return localization.t("dock.classic")
            }
        }

        private func restRingColor(for item: HomeDockDestination) -> Color {
            switch item {
            case .liveAI: return Color.red.opacity(0.6)
            case .movieAI: return DesignTokens.Primary.p400.opacity(0.6)
            default: return Color.white.opacity(0.12)
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

    private struct DockItemButtonStyle: ButtonStyle {
        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .focusEffectDisabled()
                .opacity(configuration.isPressed ? 0.8 : 1.0)
                .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
        }
    }

#endif
