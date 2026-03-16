#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    // MARK: - Sidebar

    struct TVAppSidebarView: View {
        @Environment(LocalizationManager.self) private var localization

        let avatarURL: URL?
        let restoredWidgets: [WidgetItem]
        let onAvatarTap: () -> Void
        let onAddWidget: () -> Void
        let onClose: (String) -> Void
        var onShowQuickDock: (() -> Void)? = nil

        @State private var isManuallyCollapsed = false

        private var hasWidgets: Bool {
            !restoredWidgets.isEmpty
        }

        private var isExpanded: Bool {
            hasWidgets && !isManuallyCollapsed
        }

        private let collapsedWidth: CGFloat = 80
        private let expandedWidth: CGFloat = 480
        private let avatarSize: CGFloat = 56
        private let cornerRadius: CGFloat = 24

        var body: some View {
            Group {
                if isExpanded {
                    expandedLayout
                } else {
                    collapsedLayout
                }
            }
            .background { panelBackground }
            .clipShape(panelShape)
            .overlay { panelBorder }
            .shadow(color: DesignTokens.Primary.p600.opacity(0.2), radius: 32, x: 12, y: 0)
            .ignoresSafeArea(.all, edges: .leading)
            .animation(.spring(duration: 0.4, bounce: 0.12), value: isExpanded)
            .focusSection()
            .accessibilityLabel(localization.t("widgets.sidebar.label"))
        }

        // MARK: - Collapsed

        private var collapsedLayout: some View {
            VStack(spacing: 20) {
                Spacer()

                avatarButton

                if hasWidgets {
                    widgetCountBadge
                    expandToggleButton
                }

                if let showDock = onShowQuickDock {
                    quickDockTriggerButton(action: showDock)
                }

                Spacer()
            }
            .frame(width: collapsedWidth)
            .frame(maxHeight: .infinity)
        }

        private func quickDockTriggerButton(action: @escaping () -> Void) -> some View {
            Button(action: action) {
                Image(systemName: "square.grid.3x1.below.line.grid.1x2")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 36, height: 36)
                    .background(DesignTokens.Primary.p600.opacity(0.12))
                    .clipShape(Circle())
                    .overlay(
                        Circle().strokeBorder(DesignTokens.Primary.p400.opacity(0.3), lineWidth: 1)
                    )
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("tvos.dock.widgets"))
        }

        /// Small badge showing the number of active widgets when collapsed.
        private var widgetCountBadge: some View {
            Text("\(restoredWidgets.count)")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 22, height: 22)
                .background(DesignTokens.Primary.p500)
                .clipShape(Circle())
        }

        // MARK: - Expanded

        private var expandedLayout: some View {
            VStack(spacing: 0) {
                expandedHeader
                    .padding(.top, 20)
                    .padding(.bottom, 12)

                dividerLine

                sectionHeader

                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: 16) {
                        ForEach(restoredWidgets) { widget in
                            TVSidebarWidgetCard(
                                widget: widget,
                                onClose: { onClose(widget.id) }
                            )
                            .padding(.horizontal, 24)
                        }
                    }
                    .padding(.vertical, 10)
                }
                .focusSection()

                sidebarFooter
            }
            .frame(width: expandedWidth)
            .frame(maxHeight: .infinity)
        }

        /// Header row: collapse chevron | avatar + Profile label | spacer
        private var expandedHeader: some View {
            HStack(alignment: .center, spacing: 0) {
                collapseToggleButton
                    .padding(.leading, 12)

                Spacer()

                VStack(spacing: 5) {
                    avatarButton
                    Text(localization.t("nav.profile"))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                }

                Spacer()

                // Balance the chevron on the left
                Color.clear.frame(width: 40, height: 1)
                    .padding(.trailing, 12)
            }
        }

        /// Footer with Add Widget button and widget count.
        private var sidebarFooter: some View {
            VStack(spacing: 10) {
                dividerLine

                addWidgetButton
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 20)
            }
        }

        // MARK: - Avatar

        private var avatarButton: some View {
            Button { onAvatarTap() } label: {
                ZStack {
                    if let url = avatarURL {
                        CachedAsyncImage(url: url) { phase in
                            if case let .success(img) = phase {
                                img.resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: avatarSize, height: avatarSize)
                                    .clipShape(Circle())
                            } else {
                                avatarPlaceholder
                            }
                        }
                    } else {
                        avatarPlaceholder
                    }

                    Circle()
                        .strokeBorder(
                            LinearGradient(
                                colors: [
                                    DesignTokens.Primary.p400,
                                    DesignTokens.Primary.p600,
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 2
                        )
                        .frame(width: avatarSize, height: avatarSize)
                }
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("nav.profile"))
        }

        private var avatarPlaceholder: some View {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [
                                DesignTokens.Primary.p700.opacity(0.5),
                                DesignTokens.Primary.p900.opacity(0.8),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: avatarSize, height: avatarSize)

                Image(systemName: "person.fill")
                    .font(.system(size: 28, weight: .medium))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p300, DesignTokens.Primary.p400],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }
        }

        // MARK: - Toggle buttons

        private var collapseToggleButton: some View {
            Button { isManuallyCollapsed = true } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .frame(width: 32, height: 32)
                    .background(Color.white.opacity(0.06))
                    .clipShape(Circle())
                    .overlay(
                        Circle().strokeBorder(Color.white.opacity(0.1), lineWidth: 0.5)
                    )
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("common.collapse"))
        }

        private var expandToggleButton: some View {
            Button { isManuallyCollapsed = false } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 36, height: 36)
                    .background(DesignTokens.Primary.p600.opacity(0.15))
                    .clipShape(Circle())
                    .overlay(
                        Circle().strokeBorder(
                            DesignTokens.Primary.p400.opacity(0.4), lineWidth: 1
                        )
                    )
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("common.expand"))
        }

        // MARK: - Section header / divider

        private var dividerLine: some View {
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [.clear, DesignTokens.Primary.p500.opacity(0.35), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(height: 1)
                .padding(.horizontal, 24)
        }

        private var sectionHeader: some View {
            HStack(spacing: 6) {
                Text(localization.t("widgets.activeWidgets").uppercased())
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .tracking(1.8)
                Spacer()
                Text("\(restoredWidgets.count)")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 6)
        }

        // MARK: - Add Widget

        private var addWidgetButton: some View {
            Button { onAddWidget() } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.p400)
                    Text(localization.t("widgets.addWidget"))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(DesignTokens.Primary.p600.opacity(0.1))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(
                            LinearGradient(
                                colors: [
                                    DesignTokens.Primary.p400.opacity(0.6),
                                    DesignTokens.Primary.p600.opacity(0.3),
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

        // MARK: - Panel chrome

        private var panelShape: UnevenRoundedRectangle {
            UnevenRoundedRectangle(
                topLeadingRadius: 0,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: cornerRadius,
                topTrailingRadius: cornerRadius
            )
        }

        private var panelBackground: some View {
            ZStack {
                Color(red: 0.04, green: 0.04, blue: 0.1)
                Rectangle().fill(.ultraThinMaterial).environment(\.colorScheme, .dark)
                DesignTokens.Primary.p900.opacity(0.12)
            }
        }

        private var panelBorder: some View {
            panelShape.strokeBorder(
                LinearGradient(
                    colors: [
                        DesignTokens.Primary.p500.opacity(0.6),
                        DesignTokens.Primary.p700.opacity(0.25),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                ),
                lineWidth: 1
            )
        }
    }

    // MARK: - Sidebar Widget Card

    struct TVSidebarWidgetCard: View {
        let widget: WidgetItem
        let onClose: () -> Void

        private let cardRadius: CGFloat = 18

        var body: some View {
            ZStack(alignment: .topTrailing) {
                TVWidgetContainerView(widget: widget)
                    .frame(maxHeight: 400)

                closeButton
                    .padding(.top, 6)
                    .padding(.trailing, 6)
            }
            .clipShape(RoundedRectangle(cornerRadius: cardRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cardRadius)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                DesignTokens.Primary.p400.opacity(0.6),
                                DesignTokens.Primary.p600.opacity(0.25),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.5
                    )
            )
            .shadow(color: DesignTokens.Primary.p500.opacity(0.15), radius: 8, x: 0, y: 2)
        }

        private var closeButton: some View {
            Button { onClose() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.white.opacity(0.85))
                    .frame(width: 24, height: 24)
                    .background(Circle().fill(Color.black.opacity(0.6)))
                    .overlay(
                        Circle().strokeBorder(Color.white.opacity(0.2), lineWidth: 0.5)
                    )
            }
            .buttonStyle(WidgetCompactButtonStyle())
            .accessibilityLabel("Close widget")
        }
    }
#endif
