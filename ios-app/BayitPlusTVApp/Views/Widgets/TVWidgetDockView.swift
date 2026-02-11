#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// Horizontal widget dock at the bottom of the tvOS screen.
/// Shows minimized widgets as icon-only focusable circles.
/// When focused, a floating label appears above the item.
/// Supports collapse/expand toggle for a compact mode.
struct TVWidgetDockView: View {

    let widgets: [WidgetItem]
    let isDockVisible: Bool
    let onRestore: (String) -> Void
    let onCloseDock: () -> Void

    @State private var isCollapsed = false

    var body: some View {
        if isDockVisible && !widgets.isEmpty {
            dockBar
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .animation(.spring(duration: 0.35, bounce: 0.12), value: isDockVisible)
        }
    }

    // MARK: - Dock Bar

    private var dockBar: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            dockHandle

            if !isCollapsed {
                ForEach(widgets) { widget in
                    DockPillButton(
                        widget: widget,
                        onRestore: onRestore
                    )
                }

                Divider()
                    .frame(height: 44)
                    .background(DesignTokens.Glass.borderLight)
            }

            collapseToggle
            closeButton
        }
        .focusSection()
        .animation(.spring(duration: 0.3, bounce: 0.1), value: isCollapsed)
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .background {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
        }
        .contentShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.4), radius: 20, y: 4)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Widget Dock")
    }

    // MARK: - Dock Handle

    private var dockHandle: some View {
        Image(systemName: "square.grid.2x2.fill")
            .font(.system(size: 20, weight: .medium))
            .foregroundStyle(DesignTokens.Primary.p300)
            .frame(width: 48)
            .accessibilityLabel("\(widgets.count) minimized widgets")
    }

    // MARK: - Collapse Toggle

    private var collapseToggle: some View {
        Button {
            isCollapsed.toggle()
        } label: {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 48, height: 48)
                    .overlay(
                        Circle().stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
                    )

                Image(systemName: isCollapsed
                    ? "arrow.left.and.line.vertical.and.arrow.right"
                    : "arrow.right.and.line.vertical.and.arrow.left"
                )
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .accessibilityLabel(isCollapsed ? "Expand dock" : "Collapse dock")
    }

    // MARK: - Close Button

    private var closeButton: some View {
        Button {
            onCloseDock()
        } label: {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 48, height: 48)
                    .overlay(
                        Circle().stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
                    )

                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .accessibilityLabel("Close dock")
    }
}

// MARK: - Dock Pill Button

/// Focusable icon button for a single minimized widget.
/// Shows a floating title label above the icon when focused.
private struct DockPillButton: View {

    let widget: WidgetItem
    let onRestore: (String) -> Void

    var body: some View {
        Button {
            onRestore(widget.id)
        } label: {
            DockPillLabel(widget: widget)
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .accessibilityLabel("Restore \(widget.title)")
    }
}

// MARK: - Dock Pill Label (focus-aware)

/// Icon circle that displays a floating title tooltip when focused.
private struct DockPillLabel: View {
    @Environment(\.isFocused) private var isFocused

    let widget: WidgetItem

    var body: some View {
        ZStack {
            Circle()
                .fill(badgeColor.opacity(0.2))
                .frame(width: 56, height: 56)
                .overlay(
                    Circle()
                        .stroke(badgeColor.opacity(0.4), lineWidth: 1.5)
                )

            Image(systemName: iconName)
                .font(.system(size: 24, weight: .medium))
                .foregroundStyle(badgeColor)
        }
        .overlay(alignment: .top) {
            if isFocused {
                focusLabel
                    .offset(y: -40)
                    .transition(.opacity.combined(with: .scale(scale: 0.8)))
            }
        }
        .animation(
            .spring(duration: 0.25, bounce: 0.15),
            value: isFocused
        )
    }

    private var focusLabel: some View {
        Text(widget.title)
            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
            .lineLimit(1)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background {
                Capsule()
                    .fill(.thinMaterial)
                    .environment(\.colorScheme, .dark)
            }
            .overlay(
                Capsule().stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
            )
    }

    private var iconName: String {
        widget.content?.contentType?.iconName ?? "square.grid.2x2"
    }

    private var badgeColor: Color {
        switch widget.content?.contentType {
        case .liveChannel, .live: return DesignTokens.Primary.p400
        case .radio: return DesignTokens.Warning.default
        case .podcast: return DesignTokens.Success.default
        case .vod, .audiobook: return DesignTokens.Primary.p300
        case .iframe: return DesignTokens.Text.secondary
        default: return DesignTokens.Text.muted
        }
    }
}
#endif
