import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Animated horizontal bar showing Hebrew vs English percentage ratio.
/// Uses DesignTokens colors with smooth animation on ratio changes.
struct LanguageRatioView: View {
    let hebrewRatio: Double
    var compact: Bool = false

    @State private var animatedRatio: Double = 0
    @Environment(LocalizationManager.self) private var localization

    private var hebrewPercent: Int {
        Int(round(clampedRatio * 100))
    }

    private var englishPercent: Int {
        100 - hebrewPercent
    }

    private var clampedRatio: Double {
        min(max(animatedRatio, 0), 1)
    }

    var body: some View {
        VStack(spacing: compact ? DesignTokens.Spacing.xxs : DesignTokens.Spacing.sm) {
            ratioBar
            percentageLabels
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6)) {
                animatedRatio = hebrewRatio
            }
        }
        .onChange(of: hebrewRatio) { _, newValue in
            withAnimation(.easeInOut(duration: 0.4)) {
                animatedRatio = newValue
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Language ratio")
        .accessibilityValue("Hebrew \(hebrewPercent) percent, English \(englishPercent) percent")
    }

    // MARK: - Bar

    private var ratioBar: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let hebrewWidth = max(0, width * CGFloat(clampedRatio))

            ZStack(alignment: .leading) {
                // English track (full width background)
                Capsule()
                    .fill(Color.white.opacity(0.15))

                // Hebrew fill
                Capsule()
                    .fill(DesignTokens.Info.default)
                    .frame(width: hebrewWidth)
            }
        }
        .frame(height: compact ? 4 : 8)
        .clipShape(Capsule())
    }

    // MARK: - Labels

    private var percentageLabels: some View {
        HStack {
            Text(localization.t("vocabulary.hebrewPercent", ["percent": "\(hebrewPercent)"]))
                .font(.system(
                    size: compact ? DesignTokens.FontSize.xs : DesignTokens.FontSize.sm,
                    weight: .medium
                ))
                .foregroundStyle(DesignTokens.Info.i400)

            Spacer()

            Text(localization.t("vocabulary.englishPercent", ["percent": "\(englishPercent)"]))
                .font(.system(
                    size: compact ? DesignTokens.FontSize.xs : DesignTokens.FontSize.sm,
                    weight: .medium
                ))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }
}
