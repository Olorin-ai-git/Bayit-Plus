import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// View modifier that shows a one-shot tooltip for a feature on first encounter.
/// Uses TooltipManager to track shown state per user.
struct FeatureTooltipModifier: ViewModifier {
    let featureKey: String
    let titleKey: String
    let descriptionKey: String
    let arrowDirection: TooltipArrowDirection
    let tooltipManager: TooltipManager

    @Environment(LocalizationManager.self) var localization
    @State private var showTooltip = false

    func body(content: Content) -> some View {
        content
            .overlay(alignment: alignment(for: arrowDirection)) {
                if showTooltip {
                    GlassTooltip(
                        title: localization.t(titleKey),
                        message: localization.t(descriptionKey),
                        arrowDirection: arrowDirection
                    ) {
                        dismissTooltip()
                    }
                    .transition(.scale.combined(with: .opacity))
                    .zIndex(100)
                }
            }
            .onAppear {
                checkAndShowTooltip()
            }
    }

    private func checkAndShowTooltip() {
        guard tooltipManager.shouldShow(featureKey) else { return }
        let delaySeconds = 1.5
        DispatchQueue.main.asyncAfter(deadline: .now() + delaySeconds) {
            withAnimation(.spring(response: 0.4)) {
                showTooltip = true
            }
        }
    }

    private func dismissTooltip() {
        withAnimation(.easeOut(duration: 0.2)) {
            showTooltip = false
        }
        tooltipManager.markShown(featureKey)
    }

    private func alignment(for direction: TooltipArrowDirection) -> Alignment {
        switch direction {
        case .top: return .bottom
        case .bottom: return .top
        case .leading: return .trailing
        case .trailing: return .leading
        }
    }
}

extension View {
    func featureTooltip(
        featureKey: String,
        titleKey: String,
        descriptionKey: String,
        arrowDirection: TooltipArrowDirection = .top,
        tooltipManager: TooltipManager
    ) -> some View {
        modifier(FeatureTooltipModifier(
            featureKey: featureKey,
            titleKey: titleKey,
            descriptionKey: descriptionKey,
            arrowDirection: arrowDirection,
            tooltipManager: tooltipManager
        ))
    }
}
