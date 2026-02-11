#if os(tvOS)
import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Glassmorphic sidebar for restored (non-minimized) widgets on tvOS.
/// Docks to the right edge of the screen with a wide panel showing
/// widget posters, content details, and playback controls.
struct TVWidgetSidebarView: View {

    let widgets: [WidgetItem]
    let onMinimize: (String) -> Void

    @State private var isExpanded = false

    private let expandedWidth: CGFloat = 420
    private let collapsedWidth: CGFloat = 80

    var body: some View {
        if !widgets.isEmpty {
            sidebarContent
                .transition(.move(edge: .trailing).combined(with: .opacity))
                .animation(.spring(duration: 0.4, bounce: 0.12), value: widgets.count)
        }
    }

    // MARK: - Sidebar Content

    private var sidebarContent: some View {
        VStack(spacing: 0) {
            sidebarHeader

            if isExpanded {
                Divider()
                    .background(DesignTokens.Glass.borderLight)
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: TVDesignTokens.Spacing.lg) {
                        ForEach(widgets) { widget in
                            TVWidgetContainerView(
                                widget: widget,
                                onMinimize: { onMinimize(widget.id) }
                            )
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.lg)
                }
                .focusSection()
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
                topLeadingRadius: TVDesignTokens.Radius.xl,
                bottomLeadingRadius: TVDesignTokens.Radius.xl,
                bottomTrailingRadius: 0,
                topTrailingRadius: 0
            )
        )
        .overlay(
            UnevenRoundedRectangle(
                topLeadingRadius: TVDesignTokens.Radius.xl,
                bottomLeadingRadius: TVDesignTokens.Radius.xl,
                bottomTrailingRadius: 0,
                topTrailingRadius: 0
            )
            .stroke(
                DesignTokens.Glass.border,
                lineWidth: 2
            )
        )
        .shadow(color: .black.opacity(0.5), radius: 32, x: -12, y: 0)
        .ignoresSafeArea(.all, edges: .trailing)
    }

    // MARK: - Header

    @ViewBuilder
    private var sidebarHeader: some View {
        if isExpanded {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "square.grid.2x2.fill")
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p300)

                Text("Widgets")
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                widgetCountBadge(size: 34, fontSize: TVDesignTokens.FontSize.xs)

                Spacer()

                collapseExpandButton
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        } else {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "square.grid.2x2.fill")
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p300)

                widgetCountBadge(size: 36, fontSize: TVDesignTokens.FontSize.xs)

                collapseExpandButton
            }
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Collapse / Expand

    private var collapseExpandButton: some View {
        Button {
            withAnimation(.spring(duration: 0.35, bounce: 0.1)) {
                isExpanded.toggle()
            }
        } label: {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Circle().stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
                    )

                Image(systemName: isExpanded
                    ? "chevron.right"
                    : "chevron.left"
                )
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .accessibilityLabel(isExpanded ? "Collapse sidebar" : "Expand sidebar")
    }

    private func widgetCountBadge(size: CGFloat, fontSize: CGFloat) -> some View {
        Text("\(widgets.count)")
            .font(.system(size: fontSize, weight: .bold))
            .foregroundStyle(DesignTokens.Primary.p300)
            .frame(width: size, height: size)
            .background(DesignTokens.Primary.p400.opacity(0.15))
            .clipShape(Circle())
            .overlay(
                Circle().stroke(DesignTokens.Primary.p400.opacity(0.3), lineWidth: 1)
            )
    }
}
#endif
