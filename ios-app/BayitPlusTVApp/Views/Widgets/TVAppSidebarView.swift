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

        private var isExpanded: Bool {
            !restoredWidgets.isEmpty
        }

        private let collapsedWidth: CGFloat = 80
        private let expandedWidth: CGFloat = 320
        private let avatarSize: CGFloat = 56
        private let cardCornerRadius: CGFloat = 24

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
            VStack {
                Spacer()
                avatarButton
                Spacer()
            }
            .frame(width: collapsedWidth)
            .frame(maxHeight: .infinity)
        }

        // MARK: - Expanded

        private var expandedLayout: some View {
            VStack(spacing: 0) {
                VStack(spacing: 6) {
                    avatarButton
                    Text(localization.t("nav.profile"))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 24)
                .padding(.bottom, 16)

                dividerLine

                sectionHeader

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 10) {
                        ForEach(restoredWidgets) { widget in
                            TVSidebarWidgetCard(
                                widget: widget,
                                onClose: { onClose(widget.id) }
                            )
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                }
                .focusSection()

                addWidgetButton
                    .padding(.horizontal, 14)
                    .padding(.bottom, 24)
            }
            .frame(width: expandedWidth)
            .frame(maxHeight: .infinity)
        }

        // MARK: - Avatar Button

        private var avatarButton: some View {
            Button { onAvatarTap() } label: {
                ZStack {
                    if let url = authManager.user?.photoURL {
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

        // MARK: - Section header / divider

        private var dividerLine: some View {
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [.clear, DesignTokens.Primary.p500.opacity(0.4), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(height: 1)
                .padding(.horizontal, 20)
        }

        private var sectionHeader: some View {
            HStack {
                Text(localization.t("widgets.activeWidgets").uppercased())
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .tracking(2)
                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 4)
        }

        // MARK: - Add Widget

        private var addWidgetButton: some View {
            Button { onAddWidget() } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.system(size: 11, weight: .bold))
                    Text(localization.t("widgets.addWidget"))
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity)
                .frame(height: 40)
                .background(
                    Capsule().fill(DesignTokens.Primary.p600.opacity(0.08))
                )
                .overlay(
                    Capsule().strokeBorder(
                        LinearGradient(
                            colors: [
                                DesignTokens.Primary.p400.opacity(0.7),
                                DesignTokens.Primary.p600.opacity(0.4),
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
                bottomTrailingRadius: cardCornerRadius,
                topTrailingRadius: cardCornerRadius
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

    /// Wraps the full interactive TVWidgetContainerView with an X close overlay,
    /// constrained to fit within the sidebar width.
    struct TVSidebarWidgetCard: View {
        let widget: WidgetItem
        let onClose: () -> Void

        var body: some View {
            ZStack(alignment: .topTrailing) {
                TVWidgetContainerView(widget: widget, onMinimize: onClose)
                    .frame(maxWidth: .infinity)

                closeButton
                    .padding(.top, 6)
                    .padding(.trailing, 6)
            }
        }

        private var closeButton: some View {
            Button { onClose() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.white.opacity(0.8))
                    .frame(width: 20, height: 20)
                    .background(Circle().fill(Color.black.opacity(0.55)))
                    .overlay(
                        Circle().strokeBorder(Color.white.opacity(0.2), lineWidth: 0.5)
                    )
            }
            .tvCardStyle()
            .accessibilityLabel("Close widget")
        }
    }
#endif
