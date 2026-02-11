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
    let onPlay: (WidgetItem) -> Void

    private let sidebarWidth: CGFloat = 420

    var body: some View {
        if !widgets.isEmpty {
            HStack(spacing: 0) {
                Spacer()
                sidebarContent
            }
            .transition(.move(edge: .trailing).combined(with: .opacity))
            .animation(.spring(duration: 0.4, bounce: 0.12), value: widgets.count)
        }
    }

    // MARK: - Sidebar Content

    private var sidebarContent: some View {
        VStack(spacing: 0) {
            sidebarHeader

            Divider()
                .background(DesignTokens.Glass.borderLight)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(widgets) { widget in
                        TVWidgetContainerView(
                            widget: widget,
                            onMinimize: { onMinimize(widget.id) },
                            onPlay: { onPlay(widget) }
                        )
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
            .focusSection()
        }
        .frame(width: sidebarWidth)
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
    }

    // MARK: - Header

    private var sidebarHeader: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "square.grid.2x2.fill")
                .font(.system(size: 26, weight: .medium))
                .foregroundStyle(DesignTokens.Primary.p300)

            Text("Active Widgets")
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text("\(widgets.count)")
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p300)
                .frame(width: 40, height: 40)
                .background(DesignTokens.Primary.p400.opacity(0.15))
                .clipShape(Circle())
                .overlay(
                    Circle().stroke(DesignTokens.Primary.p400.opacity(0.3), lineWidth: 1)
                )
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }
}
#endif
