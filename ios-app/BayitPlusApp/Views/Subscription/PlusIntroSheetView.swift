import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct PlusIntroSheetView: View {
    let onSeePlans: () -> Void
    let onDismiss: () -> Void

    @Environment(LocalizationManager.self) private var localization

    private let features: [(icon: String, key: String)] = [
        ("mic.fill", "bullet1"),
        ("captions.bubble.fill", "bullet2"),
        ("magnifyingglass", "bullet3"),
        ("bitcoinsign.circle.fill", "bullet4"),
    ]

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("plus.intro.title"))
                .font(.system(size: 28, weight: .heavy))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("plus.intro.subtitle"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                ForEach(features, id: \.key) { feature in
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: feature.icon)
                            .font(.system(size: 20))
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .frame(width: 28)
                        Text(localization.t("plus.intro.\(feature.key)"))
                            .font(.system(
                                size: DesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }
            }
            .padding(.vertical, DesignTokens.Spacing.lg)

            VStack(spacing: DesignTokens.Spacing.sm) {
                GlassButton(
                    localization.t("plus.intro.seePlans"),
                    variant: .primary,
                    size: .large
                ) {
                    onSeePlans()
                }

                Button {
                    onDismiss()
                } label: {
                    Text(localization.t("plus.intro.maybeLater"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
        .padding(DesignTokens.Spacing.xl)
    }

    // MARK: - Persistence

    private static let seenKey = "bayit_plus_intro_seen"

    static var hasBeenSeen: Bool {
        UserDefaults.standard.bool(forKey: seenKey)
    }

    static func markAsSeen() {
        UserDefaults.standard.set(true, forKey: seenKey)
    }
}
