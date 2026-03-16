#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    // MARK: - Quick Access Dock

    /// Floating bottom dock overlay providing one-remote-click access to key
    /// app features: Widgets, Voice, Now Playing, Auto Fill, and Close.
    /// Triggered by setting `coordinator.showQuickDock = true`.
    struct TVQuickDockView: View {
        @Environment(LocalizationManager.self) private var localization
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(TVAudioPlaybackManager.self) private var audioManager

        let onShowWidgets: () -> Void
        let onDismiss: () -> Void

        @FocusState private var focusedItem: DockItem?

        private enum DockItem: Hashable {
            case widgets, voice, nowPlaying, audioEQ, close
        }

        private var isNowPlaying: Bool {
            audioManager.isActive
        }

        var body: some View {
            dockPill
                .padding(.bottom, 40)
                .transition(.move(edge: .bottom).combined(with: .opacity))
        }

        // MARK: - Pill Shell

        private var dockPill: some View {
            HStack(spacing: 8) {
                dockButton(
                    item: .widgets,
                    icon: "square.grid.2x2",
                    label: localization.t("tvos.dock.widgets")
                ) { onShowWidgets() }

                dockButton(
                    item: .voice,
                    icon: "mic.fill",
                    label: localization.t("tvos.dock.voice")
                ) { coordinator.selectedTab = .discover }

                dockButton(
                    item: .nowPlaying,
                    icon: "play.fill",
                    label: localization.t("tvos.dock.nowPlaying"),
                    isActive: isNowPlaying,
                    isCenter: true
                ) { coordinator.selectedTab = .podcasts }

                dockButton(
                    item: .audioEQ,
                    icon: "slider.horizontal.3",
                    label: localization.t("tvos.dock.audioEQ")
                ) { coordinator.selectedTab = .podcasts }

                dockButton(
                    item: .close,
                    icon: "xmark",
                    label: localization.t("tvos.dock.close"),
                    isDestructive: true
                ) { onDismiss() }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background { pillBackground }
            .clipShape(Capsule())
            .overlay(pillBorder)
            .shadow(color: .black.opacity(0.5), radius: 40, x: 0, y: 16)
        }

        // MARK: - Dock Button

        private func dockButton(
            item: DockItem,
            icon: String,
            label: String,
            isActive: Bool = false,
            isCenter: Bool = false,
            isDestructive: Bool = false,
            action: @escaping () -> Void
        ) -> some View {
            let isFocused = focusedItem == item
            let circleSize: CGFloat = isCenter ? 90 : 68
            let iconSize: CGFloat = isCenter ? 32 : 24
            return Button {
                action()
                if item != .close { onDismiss() }
            } label: {
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(
                                isCenter || isActive
                                    ? DesignTokens.Primary.default.opacity(0.85)
                                    : (isFocused
                                        ? Color.white.opacity(0.18)
                                        : Color.white.opacity(0.08))
                            )
                            .frame(width: circleSize, height: circleSize)
                            .overlay(
                                Circle().strokeBorder(
                                    isCenter || isActive
                                        ? DesignTokens.Primary.p400.opacity(0.6)
                                        : Color.white.opacity(0.12),
                                    lineWidth: isCenter ? 2 : 1.5
                                )
                            )

                        Image(systemName: icon)
                            .font(.system(size: iconSize, weight: .medium))
                            .foregroundStyle(
                                isDestructive
                                    ? DesignTokens.ErrorColor.e400
                                    : (isCenter || isActive ? .white : DesignTokens.Text.primary)
                            )
                    }

                    Text(label)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(
                            isDestructive
                                ? DesignTokens.ErrorColor.e400.opacity(0.85)
                                : DesignTokens.Text.secondary
                        )
                        .lineLimit(1)
                        .frame(width: 90)
                }
            }
            .buttonStyle(.plain)
            .focused($focusedItem, equals: item)
            .scaleEffect(isFocused ? 1.06 : 1.0)
            .animation(.spring(duration: 0.2, bounce: 0.3), value: isFocused)
        }

        // MARK: - Visual Chrome

        private var pillBackground: some View {
            ZStack {
                Color.black.opacity(0.72)
                Rectangle().fill(.ultraThinMaterial).environment(\.colorScheme, .dark)
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
