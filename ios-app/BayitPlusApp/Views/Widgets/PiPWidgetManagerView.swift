import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Manages up to 3 simultaneous PiP widgets with add/remove controls.
struct PiPWidgetManagerView: View {
    @Environment(LocalizationManager.self) private var localization
    @State private var activeWidgets: [PiPWidgetItem] = []

    private let maxWidgets = 3

    var body: some View {
        ZStack {
            // Active PiP widgets
            ForEach(activeWidgets) { widget in
                PiPWidgetContainerView(
                    contentId: widget.contentId,
                    onClose: { removeWidget(widget.id) },
                    onToggleFullscreen: {}
                )
            }

            // Add widget control (bottom-right corner)
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    addWidgetButton
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    // MARK: - Add Widget

    @ViewBuilder
    private var addWidgetButton: some View {
        if activeWidgets.count < maxWidgets {
            Button {
                HapticFeedbackService.impact(style: .light)
                addWidget()
            } label: {
                Image(systemName: "pip.enter")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(DesignTokens.Spacing.md)
                    .glassCard(radius: DesignTokens.Radius.full, padding: 0)
            }
        }
    }

    // MARK: - Widget Management

    private func addWidget() {
        guard activeWidgets.count < maxWidgets else { return }
        let widget = PiPWidgetItem(
            id: UUID().uuidString,
            contentId: ""
        )
        activeWidgets.append(widget)
    }

    private func removeWidget(_ id: String) {
        activeWidgets.removeAll { $0.id == id }
    }
}

/// Represents a single PiP widget instance.
struct PiPWidgetItem: Identifiable {
    let id: String
    let contentId: String
}
