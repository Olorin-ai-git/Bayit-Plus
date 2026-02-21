import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TriviaFactsOverlayView Banner Subviews

extension TriviaFactsOverlayView {
    func factBanner(_ fact: TriviaFact) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            // Header row: sparkle icon + "AI Trivia" + detected topic + dismiss
            headerRow(fact)

            // Category badge (compact pill)
            if let category = fact.category {
                categoryBadge(category: category)
            }

            // Fact text
            Text(factText(fact))
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(3)

            // Related person + follow-up row
            bottomRow(fact)

            // Auto-dismiss progress bar
            progressBar
        }
        .padding(DesignTokens.Spacing.sm)
        .background {
            ZStack {
                Color.black.opacity(0.45)
                VisualEffectBlur()
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p400.opacity(0.6),
                            DesignTokens.Glass.border,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 0.5
                )
        )
        .shadow(
            color: DesignTokens.Glass.purpleGlow.opacity(0.3),
            radius: 8,
            x: 0,
            y: 2
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(bannerAccessibilityLabel(fact))
    }

    func headerRow(_ fact: TriviaFact) -> some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "sparkles")
                .font(.system(size: 12))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("trivia.aiTrivia"))
                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)

            if let topic = fact.detectedTopic {
                Text("  \(topic)")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(1)
            }

            Spacer()

            dismissButton
        }
    }

    func categoryBadge(category: String) -> some View {
        let (icon, color) = iconAndColor(for: category)

        return HStack(spacing: 3) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(color)

            Text(category.uppercased())
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(color)
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, 2)
        .background(
            Capsule().fill(color.opacity(0.15))
        )
        .overlay(
            Capsule().stroke(color.opacity(0.3), lineWidth: 0.5)
        )
    }

    func bottomRow(_ fact: TriviaFact) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            if let person = fact.relatedPerson {
                HStack(spacing: 3) {
                    Image(systemName: "person.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(DesignTokens.Info.default)

                    Text(person)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Info.default)
                        .lineLimit(1)
                }
            }

            Spacer()

            if fact.hasFollowUp == true {
                followUpButton
            }
        }
    }

    var followUpButton: some View {
        Button {
            viewModel.requestFollowUp()
        } label: {
            HStack(spacing: 3) {
                Image(systemName: "sparkles")
                    .font(.system(size: 10))
                    .foregroundStyle(DesignTokens.Secondary.s400)

                Text(localization.t("trivia.more"))
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)

                Image(systemName: "chevron.right")
                    .font(.system(size: 8))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 3)
            .background(
                Capsule().fill(Color.white.opacity(0.1))
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(localization.t("trivia.wantToKnowMore"))
    }

    var dismissButton: some View {
        Button {
            withAnimation(.spring(duration: 0.3, bounce: 0.1)) {
                viewModel.dismissFact()
            }
        } label: {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(localization.t("common.dismiss"))
    }
}
