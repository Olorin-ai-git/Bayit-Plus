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
                if let url = item.streamURL {
                    UIApplication.shared.open(url)
                }
            }

            aiBadges
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    @ViewBuilder
    var aiBadges: some View {
        let caps = BYOCCapabilities.capabilities(for: item.sourceType)
        HStack(spacing: DesignTokens.Spacing.sm) {
            if caps.dubbing {
                aiBadgeIcon(
                    systemName: "waveform.and.person.filled",
                    label: localization.t("byoc.ai.dubbing")
                )
            }
            if caps.liveSubtitles {
                aiBadgeIcon(
                    systemName: "captions.bubble.fill",
                    label: localization.t("byoc.ai.subtitles")
                )
            }
            if caps.trivia {
                aiBadgeIcon(
                    systemName: "lightbulb.fill",
                    label: localization.t("byoc.ai.trivia")
                )
            }
            if caps.audioOverlayOnly {
                aiBadgeIcon(
                    systemName: "speaker.wave.2.fill",
                    label: localization.t("byoc.ai.audioOverlay")
                )
            }
        }
    }

    private func aiBadgeIcon(systemName: String, label: String) -> some View {
        VStack(spacing: 2) {
            Image(systemName: systemName)
                .font(.system(size: 16))
                .foregroundColor(DesignTokens.Primary.default)
                .frame(width: 44, height: 44)
                .background(DesignTokens.Glass.bg)
                .clipShape(Circle())
            Text(label)
                .font(.system(size: DesignTokens.FontSize.xs - 1))
                .foregroundColor(DesignTokens.Text.muted)
                .lineLimit(1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
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
