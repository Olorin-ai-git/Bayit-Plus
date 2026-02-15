#if os(tvOS)
import SwiftUI
import BayitDesignSystem
import BayitLocalization

struct TVQuizResultsView: View {
    let result: QuizResult
    let onPlayAgain: () -> Void
    let onDismiss: () -> Void

    @Environment(LocalizationManager.self) private var localization
    @FocusState private var focusedButton: FocusableButton?

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            resultCard
            actionButtons
        }
        .frame(maxWidth: 800)
        .onAppear {
            focusedButton = .playAgain
        }
    }

    private var resultCard: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: scoreIcon)
                .font(.system(size: 120))
                .foregroundStyle(scoreColor)

            Text(localization.t("trivia.results.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            scoreDisplay

            if let points = result.pointsEarned, points > 0 {
                shekelsDisplay(points)
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: .infinity)
        .background {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bg)
                .overlay {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                }
        }
    }

    private var scoreDisplay: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Text("\(result.score ?? 0)")
                .font(.system(size: 80, weight: .bold))
                .foregroundStyle(scoreColor)

            Text("/")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            Text("\(result.total ?? 0)")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private func shekelsDisplay(_ amount: Int) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "shekel.sign.circle.fill")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(localization.t("trivia.results.shekels.earned", ["amount": "\(amount)"]))
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .background {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .fill(DesignTokens.Primary.default.opacity(0.1))
                .overlay {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .stroke(DesignTokens.Primary.default, lineWidth: 2)
                }
        }
    }

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Button {
                onPlayAgain()
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: TVDesignTokens.FontSize.md))

                    Text(localization.t("trivia.results.play.again"))
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                }
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
            .tvFocusStyle()
            .focused($focusedButton, equals: .playAgain)

            Button {
                onDismiss()
            } label: {
                Text(localization.t("common.close"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
            .tvFocusStyle()
            .focused($focusedButton, equals: .close)
        }
    }

    private var scoreIcon: String {
        let percentage = Double(result.score ?? 0) / Double(max(result.total ?? 1, 1))
        if percentage >= 0.8 {
            return "trophy.fill"
        } else if percentage >= 0.5 {
            return "star.fill"
        } else {
            return "flag.checkered"
        }
    }

    private var scoreColor: Color {
        let percentage = Double(result.score ?? 0) / Double(max(result.total ?? 1, 1))
        if percentage >= 0.8 {
            return .green
        } else if percentage >= 0.5 {
            return DesignTokens.Primary.default
        } else {
            return DesignTokens.Text.secondary
        }
    }
}

private enum FocusableButton: Hashable {
    case playAgain
    case close
}
#endif
