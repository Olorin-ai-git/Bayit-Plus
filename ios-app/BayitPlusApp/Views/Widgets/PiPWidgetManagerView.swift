import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Floating minimized widget dock that appears on the left edge of the screen.
/// Shows icon buttons for each of the user's active widgets, matching
/// the web MinimizedWidgetDock mobile layout.
struct PiPWidgetManagerView: View {
    @Environment(LocalizationManager.self) private var localization
    let widgets: [WidgetItem]
    let isDockVisible: Bool
    let onToggleMinimize: (String) -> Void
    let onCloseDock: () -> Void

    @State private var highlightedId: String?

    var body: some View {
        if isDockVisible && !widgets.isEmpty {
            dockContent
                .transition(.move(edge: .leading).combined(with: .opacity))
                .animation(.spring(duration: 0.3, bounce: 0.15), value: isDockVisible)
        }
    }

    // MARK: - Dock Content

    private var dockContent: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(widgets) { widget in
                iconButton(for: widget)
            }
            closeButton
        }
        .padding(DesignTokens.Spacing.sm)
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
                topLeadingRadius: 0,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: DesignTokens.Radius.lg,
                topTrailingRadius: DesignTokens.Radius.lg
            )
        )
        .overlay(
            UnevenRoundedRectangle(
                topLeadingRadius: 0,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: DesignTokens.Radius.lg,
                topTrailingRadius: DesignTokens.Radius.lg
            )
            .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.3), radius: 8, x: 4, y: 0)
        .frame(maxHeight: .infinity, alignment: .center)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(localization.t("nav.widgets"))
    }

    // MARK: - Icon Button

    private func iconButton(for widget: WidgetItem) -> some View {
        let isHighlighted = highlightedId == widget.id

        return Button {
            HapticFeedbackService.impact(style: .light)
            onToggleMinimize(widget.id)
        } label: {
            ZStack {
                Circle()
                    .fill(
                        isHighlighted
                            ? Color.purple.opacity(0.3)
                            : Color.white.opacity(0.1)
                    )
                    .frame(width: 40, height: 40)
                    .overlay(
                        Circle()
                            .stroke(
                                isHighlighted
                                    ? Color.purple
                                    : DesignTokens.Glass.borderLight,
                                lineWidth: isHighlighted ? 2 : 1
                            )
                    )

                Image(systemName: iconName(for: widget))
                    .font(.system(size: 18))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
        .accessibilityLabel(widget.title)
    }

    private func iconName(for widget: WidgetItem) -> String {
        widget.content?.contentType?.iconName ?? "square.grid.2x2"
    }

    // MARK: - Close Button

    private var closeButton: some View {
        Button {
            HapticFeedbackService.impact(style: .light)
            onCloseDock()
        } label: {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 24, height: 24)

                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .accessibilityLabel(localization.t("widgets.hideDock"))
    }
}

/// Represents a single PiP widget instance.
struct PiPWidgetItem: Identifiable {
    let id: String
    let contentId: String
}
