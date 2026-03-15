#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Persistent left-edge sidebar: profile avatar at top, active widget cards below,
    /// "Add Widget" button at bottom. Collapses to 80pt avatar-only strip when no widgets are active.
    struct TVAppSidebarView: View {
        @Environment(LocalizationManager.self) private var localization

        let restoredWidgets: [WidgetItem]
        let onAvatarTap: () -> Void
        let onAddWidget: () -> Void
        let onClose: (String) -> Void

        private var isExpanded: Bool {
            !restoredWidgets.isEmpty
        }

        private let collapsedWidth: CGFloat = 80
        private let expandedWidth: CGFloat = 380

        var body: some View {
            VStack(spacing: 0) {
                avatarButton
                    .padding(.top, TVDesignTokens.Spacing.xl)

                if isExpanded {
                    Divider()
                        .background(DesignTokens.Glass.borderLight)
                        .padding(.horizontal, TVDesignTokens.Spacing.md)
                        .padding(.top, TVDesignTokens.Spacing.md)

                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(spacing: TVDesignTokens.Spacing.lg) {
                            ForEach(restoredWidgets) { widget in
                                TVWidgetContainerView(
                                    widget: widget,
                                    onMinimize: { onClose(widget.id) }
                                )
                            }
                        }
                        .padding(.horizontal, TVDesignTokens.Spacing.md)
                        .padding(.vertical, TVDesignTokens.Spacing.lg)
                    }
                    .focusSection()

                    Spacer()

                    GlassButton(
                        localization.t("widgets.addWidget"),
                        variant: .secondary,
                        size: .medium,
                        icon: Image(systemName: "plus")
                    ) {
                        onAddWidget()
                    }
                    .tvCardStyle()
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.bottom, TVDesignTokens.Spacing.xl)
                } else {
                    Spacer()
                }
            }
            .frame(width: isExpanded ? expandedWidth : collapsedWidth)
            .frame(maxHeight: .infinity)
            .background {
                ZStack {
                    Color.black.opacity(0.35)
                    Rectangle()
                        .fill(.thinMaterial)
                        .environment(\.colorScheme, .dark)
                }
            }
            .clipShape(
                UnevenRoundedRectangle(
                    topLeadingRadius: 0,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: TVDesignTokens.Radius.xl,
                    topTrailingRadius: TVDesignTokens.Radius.xl
                )
            )
            .overlay(
                UnevenRoundedRectangle(
                    topLeadingRadius: 0,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: TVDesignTokens.Radius.xl,
                    topTrailingRadius: TVDesignTokens.Radius.xl
                )
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.5), radius: 32, x: 12, y: 0)
            .ignoresSafeArea(.all, edges: .leading)
            .animation(.spring(duration: 0.4, bounce: 0.12), value: isExpanded)
            .focusSection()
            .accessibilityElement(children: .contain)
            .accessibilityLabel(localization.t("widgets.sidebar.label"))
        }

        private var avatarButton: some View {
            Button {
                onAvatarTap()
            } label: {
                Circle()
                    .fill(DesignTokens.Primary.p400.opacity(0.15))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(DesignTokens.Primary.p300)
                    )
                    .overlay(
                        Circle().stroke(DesignTokens.Primary.p400.opacity(0.3), lineWidth: 1.5)
                    )
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("nav.profile"))
        }
    }
#endif
