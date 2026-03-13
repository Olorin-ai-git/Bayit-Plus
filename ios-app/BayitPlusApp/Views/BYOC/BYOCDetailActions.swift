import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Action Buttons for BYOCDetailView

extension BYOCDetailView {
    var actionButtons: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                localization.t("content.play"),
                variant: .primary,
                size: .large,
                icon: Image(systemName: "play.fill")
            ) {
                if let route = BYOCPlayerAdapter.playerRoute(
                    for: item, enrichment: enrichmentResult
                ) {
                    coordinator.presentFullscreen(.player(
                        contentId: route.contentId,
                        contentType: route.contentType
                    ))
                }
            }
            .disabled(isEnriching && item.sourceType != .youtube)
            .accessibilityIdentifier("byocPlayButton")

            sparklesButton
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .sheet(isPresented: $showAIFeaturesSheet) {
            BYOCAIFeaturesSheet()
        }
    }

    private var sparklesButton: some View {
        Button {
            showAIFeaturesSheet = true
        } label: {
            Image(systemName: "sparkles")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 44, height: 44)
                .background(DesignTokens.Glass.bg)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(DesignTokens.Primary.p400.opacity(0.4), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(localization.t("byoc.ai.sparklesButton"))
    }

    func loadEnrichment() async {
        guard let queue = byocManager.enrichmentQueue else { return }
        enrichmentResult = queue.result(for: item)
        if enrichmentResult == nil {
            isEnriching = true
            await queue.enrichSingle(item)
            enrichmentResult = queue.result(for: item)
            isEnriching = false
        }
    }
}
