#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    /// Horizontal segmented bar showing Hebrew/English balance in bilingual dubbing.
    /// Compact design suitable for embedding in TVAIFeaturesPanel or player overlay.
    struct TVLanguageRatioView: View {
        let hebrewPercentage: Double
        let englishPercentage: Double

        private var isValidRatio: Bool {
            hebrewPercentage > 0 || englishPercentage > 0
        }

        var body: some View {
            if isValidRatio {
                activeRatioBar
            } else {
                emptyRatioBar
            }
        }

        // MARK: - Active Ratio Bar

        private var activeRatioBar: some View {
            GeometryReader { geometry in
                HStack(spacing: 0) {
                    englishSegment(barWidth: geometry.size.width)
                    hebrewSegment(barWidth: geometry.size.width)
                }
            }
            .frame(height: 24)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .strokeBorder(
                        DesignTokens.Glass.border,
                        lineWidth: 1
                    )
            )
        }

        private func englishSegment(barWidth: CGFloat) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                if englishPercentage > 0 {
                    Text("EN")
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .bold
                        ))
                        .foregroundStyle(.white)
                        .padding(.leading, TVDesignTokens.Spacing.sm)

                    Spacer()

                    Text("\(Int(englishPercentage))%")
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .semibold,
                            design: .monospaced
                        ))
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.trailing, TVDesignTokens.Spacing.sm)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(
                width: englishPercentage > 0
                    ? (barWidth * (englishPercentage / 100))
                    : 0
            )
            .background(
                LinearGradient(
                    colors: [
                        DesignTokens.Secondary.s600,
                        DesignTokens.Secondary.s800,
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
        }

        private func hebrewSegment(barWidth: CGFloat) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                if hebrewPercentage > 0 {
                    Text("\(Int(hebrewPercentage))%")
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .semibold,
                            design: .monospaced
                        ))
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.leading, TVDesignTokens.Spacing.sm)

                    Spacer()

                    Text("עב")
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .bold
                        ))
                        .foregroundStyle(.white)
                        .padding(.trailing, TVDesignTokens.Spacing.sm)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(
                width: hebrewPercentage > 0
                    ? (barWidth * (hebrewPercentage / 100))
                    : 0
            )
            .background(
                LinearGradient(
                    colors: [
                        DesignTokens.Primary.p600,
                        DesignTokens.Primary.p800,
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .environment(\.layoutDirection, .rightToLeft)
        }

        // MARK: - Empty State

        private var emptyRatioBar: some View {
            HStack {
                Text("EN")
                    .font(.system(
                        size: TVDesignTokens.FontSize.xs,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.muted)

                Spacer()

                Rectangle()
                    .fill(DesignTokens.Glass.bgLight)
                    .frame(maxWidth: .infinity)
                    .frame(height: 2)

                Spacer()

                Text("עב")
                    .font(.system(
                        size: TVDesignTokens.FontSize.xs,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(height: 24)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
        }
    }

    // MARK: - Preview

    #Preview {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            TVLanguageRatioView(hebrewPercentage: 70, englishPercentage: 30)
            TVLanguageRatioView(hebrewPercentage: 50, englishPercentage: 50)
            TVLanguageRatioView(hebrewPercentage: 25, englishPercentage: 75)
            TVLanguageRatioView(hebrewPercentage: 0, englishPercentage: 0)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Background.primary)
    }
#endif
