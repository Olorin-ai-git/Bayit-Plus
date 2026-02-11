#if os(tvOS)
import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Glass sidebar for restored (non-minimized) widgets on tvOS.
/// Docks to the right edge of the screen. Multiple widgets stack vertically
/// inside a scrollable glass panel. Each widget shows content info and play controls.
struct TVWidgetSidebarView: View {

    let widgets: [WidgetItem]
    let onMinimize: (String) -> Void
    let onPlay: (WidgetItem) -> Void

    private let sidebarWidth: CGFloat = 380

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

    private var sidebarContent: some View {
        VStack(spacing: 0) {
            sidebarHeader

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(widgets) { widget in
                        TVWidgetContainerView(
                            widget: widget,
                            onMinimize: { onMinimize(widget.id) },
                            onPlay: { onPlay(widget) }
                        )
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
            }
        }
        .frame(width: sidebarWidth)
        .frame(maxHeight: .infinity)
        .background {
            ZStack {
                Color.black.opacity(0.85)
                Rectangle()
                    .fill(.ultraThinMaterial)
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
            .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.5), radius: 20, x: -8, y: 0)
    }

    private var sidebarHeader: some View {
        HStack {
            Image(systemName: "square.grid.2x2.fill")
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Primary.p300)

            Text("Widgets")
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text("\(widgets.count)")
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                .padding(.vertical, TVDesignTokens.Spacing.xs)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(Capsule())
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }
}
#endif
