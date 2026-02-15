#if os(tvOS)
import SwiftUI
import BayitDesignSystem
import BayitLocalization

struct TVQuizProgressView: View {
    let current: Int
    let total: Int
    let score: Int

    @Environment(LocalizationManager.self) private var localization

    private var progress: CGFloat {
        guard total > 0 else { return 0 }
        return CGFloat(current) / CGFloat(total)
    }

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            HStack(alignment: .center, spacing: TVDesignTokens.Spacing.md) {
                questionLabel
                Spacer()
                scoreLabel
            }

            progressBar
        }
    }

    private var questionLabel: some View {
        Text(localization.t("trivia.question.counter", ["current": String(current), "total": String(total)]))
            .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
    }

    private var scoreLabel: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "star.fill")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(localization.t("trivia.score", ["score": String(score)]))
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
        .background {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                .fill(DesignTokens.Glass.bg)
                .overlay {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                }
        }
    }

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .fill(DesignTokens.Glass.bg)
                    .overlay {
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                            .stroke(DesignTokens.Glass.border, lineWidth: 1)
                    }

                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .fill(
                        LinearGradient(
                            colors: [DesignTokens.Primary.default, DesignTokens.Primary.p500],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geometry.size.width * progress)
            }
        }
        .frame(height: 8)
    }
}
#endif
