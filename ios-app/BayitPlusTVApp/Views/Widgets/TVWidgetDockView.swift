#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// Horizontal widget dock at the bottom of the tvOS screen.
/// Shows minimized widgets as focusable circular icons.
/// Matches the web desktop MinimizedWidgetDock layout.
struct TVWidgetDockView: View {

    let widgets: [WidgetItem]
    let isDockVisible: Bool
    let onRestore: (String) -> Void
    let onCloseDock: () -> Void

    var body: some View {
        if isDockVisible && !widgets.isEmpty {
            VStack {
                Spacer()
                dockBar
            }
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .animation(.spring(duration: 0.3, bounce: 0.15), value: isDockVisible)
        }
    }

    private var dockBar: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(widgets) { widget in
                widgetIcon(widget)
            }

            closeButton
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(Capsule())
        .overlay(
            Capsule().stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.4), radius: 16, y: -4)
        .padding(.bottom, TVDesignTokens.Spacing.lg)
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Widget Dock")
    }

    private func widgetIcon(_ widget: WidgetItem) -> some View {
        Button {
            onRestore(widget.id)
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 64, height: 64)
                        .overlay(
                            Circle().stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
                        )

                    Image(systemName: iconName(for: widget))
                        .font(.system(size: 28))
                        .foregroundStyle(DesignTokens.Text.primary)
                }

                Text(widget.title)
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(1)
                    .frame(maxWidth: 80)
            }
            .frame(
                minWidth: TVDesignTokens.MinSize.focusableWidth,
                minHeight: TVDesignTokens.MinSize.focusableHeight
            )
        }
        .buttonStyle(.card)
        .accessibilityLabel("Restore \(widget.title)")
    }

    private func iconName(for widget: WidgetItem) -> String {
        widget.content?.contentType?.iconName ?? "square.grid.2x2"
    }

    private var closeButton: some View {
        Button {
            onCloseDock()
        } label: {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 40, height: 40)

                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .buttonStyle(.card)
        .accessibilityLabel("Close dock")
    }
}
#endif
