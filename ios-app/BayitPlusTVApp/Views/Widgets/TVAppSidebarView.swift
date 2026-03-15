#if os(tvOS)
    import BayitAuth
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Persistent left-edge sidebar: profile avatar at top, active widget cards below,
    /// "Add Widget" button at bottom. Collapses to 80pt avatar-only strip when no widgets are active.
    struct TVAppSidebarView: View {
        @Environment(LocalizationManager.self) private var localization
        @Environment(AuthManager.self) private var authManager

        let restoredWidgets: [WidgetItem]
        let onAvatarTap: () -> Void
        let onAddWidget: () -> Void
        let onClose: (String) -> Void

        private var isExpanded: Bool {
            !restoredWidgets.isEmpty
        }

        private let collapsedWidth: CGFloat = 88
        private let expandedWidth: CGFloat = 340

        var body: some View {
            VStack(spacing: 0) {
                avatarSection
                    .padding(.top, TVDesignTokens.Spacing.sm)
                    .frame(height: 70)

                if isExpanded {
                    sectionDivider

                    widgetSectionHeader

                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(spacing: TVDesignTokens.Spacing.sm) {
                            ForEach(restoredWidgets) { widget in
                                TVSidebarWidgetCard(
                                    widget: widget,
                                    onClose: { onClose(widget.id) }
                                )
                            }
                        }
                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                        .padding(.vertical, TVDesignTokens.Spacing.sm)
                    }
                    .focusSection()

                    addWidgetButton
                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                        .padding(.bottom, TVDesignTokens.Spacing.lg)
                } else {
                    Spacer()
                }
            }
            .frame(width: isExpanded ? expandedWidth : collapsedWidth)
            .frame(maxHeight: .infinity)
            .background { sidebarBackground }
            .clipShape(
                UnevenRoundedRectangle(
                    topLeadingRadius: 0,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: TVDesignTokens.Radius.xl,
                    topTrailingRadius: TVDesignTokens.Radius.xl
                )
            )
            .overlay(sidebarBorder)
            .shadow(color: DesignTokens.Primary.p600.opacity(0.15), radius: 40, x: 16, y: 0)
            .ignoresSafeArea(.all, edges: .leading)
            .animation(.spring(duration: 0.4, bounce: 0.12), value: isExpanded)
            .focusSection()
            .accessibilityLabel(localization.t("widgets.sidebar.label"))
        }

        // MARK: - Avatar

        private var avatarSection: some View {
            VStack(spacing: 4) {
                avatarButton
                if isExpanded {
                    Text(localization.t("nav.profile"))
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                }
            }
        }

        private var avatarButton: some View {
            Button {
                onAvatarTap()
            } label: {
                ZStack {
                    if let url = authManager.user?.photoURL {
                        CachedAsyncImage(url: url) { phase in
                            if case let .success(img) = phase {
                                img
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 52, height: 52)
                                    .clipShape(Circle())
                            } else {
                                avatarFallback
                            }
                        }
                    } else {
                        avatarFallback
                    }

                    Circle()
                        .stroke(
                            LinearGradient(
                                colors: [
                                    DesignTokens.Primary.p400.opacity(0.8),
                                    DesignTokens.Primary.p600.opacity(0.4),
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1.5
                        )
                        .frame(width: 52, height: 52)
                }
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("nav.profile"))
        }

        private var avatarFallback: some View {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [
                                DesignTokens.Primary.p500.opacity(0.25),
                                DesignTokens.Primary.p800.opacity(0.4),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 52, height: 52)

                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p300, DesignTokens.Primary.p400],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }
        }

        // MARK: - Widgets section

        private var sectionDivider: some View {
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [
                            Color.clear,
                            DesignTokens.Primary.p500.opacity(0.3),
                            Color.clear,
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(height: 1)
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                .padding(.top, TVDesignTokens.Spacing.xs)
        }

        private var widgetSectionHeader: some View {
            HStack {
                Text(localization.t("widgets.activeWidgets"))
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .tracking(1.5)
                    .textCase(.uppercase)
                Spacer()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.sm + 4)
            .padding(.top, TVDesignTokens.Spacing.xs)
            .padding(.bottom, 2)
        }

        private var addWidgetButton: some View {
            Button {
                onAddWidget()
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .semibold))
                    Text(localization.t("widgets.addWidget"))
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(
                    Capsule()
                        .fill(DesignTokens.Primary.p600.opacity(0.12))
                )
                .overlay(
                    Capsule()
                        .stroke(
                            LinearGradient(
                                colors: [
                                    DesignTokens.Primary.p400.opacity(0.5),
                                    DesignTokens.Primary.p600.opacity(0.25),
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("widgets.addWidget"))
        }

        // MARK: - Background / Border

        private var sidebarBackground: some View {
            ZStack {
                Color(red: 0.04, green: 0.04, blue: 0.1)
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .dark)
                DesignTokens.Primary.p900.opacity(0.15)
            }
        }

        private var sidebarBorder: some View {
            UnevenRoundedRectangle(
                topLeadingRadius: 0,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: TVDesignTokens.Radius.xl,
                topTrailingRadius: TVDesignTokens.Radius.xl
            )
            .stroke(
                LinearGradient(
                    colors: [
                        DesignTokens.Primary.p500.opacity(0.5),
                        DesignTokens.Primary.p700.opacity(0.2),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                ),
                lineWidth: 1
            )
        }
    }

    // MARK: - Sidebar Widget Card

    /// Compact widget card for the sidebar with an X close button overlaid top-right.
    struct TVSidebarWidgetCard: View {
        let widget: WidgetItem
        let onClose: () -> Void

        var body: some View {
            ZStack(alignment: .topTrailing) {
                TVWidgetContainerView(widget: widget, onMinimize: onClose)

                closeButton
                    .padding(.top, 6)
                    .padding(.trailing, 6)
            }
        }

        private var closeButton: some View {
            Button {
                onClose()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.white.opacity(0.7))
                    .frame(width: 20, height: 20)
                    .background(Circle().fill(Color.black.opacity(0.5)))
                    .overlay(Circle().stroke(Color.white.opacity(0.15), lineWidth: 0.5))
            }
            .tvCardStyle()
            .accessibilityLabel("Close widget")
        }
    }
#endif
