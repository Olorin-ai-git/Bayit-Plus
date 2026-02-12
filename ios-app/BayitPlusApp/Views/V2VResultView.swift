import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct V2VResultView: View {
    @Environment(LocalizationManager.self) private var localization

    let scoreBefore: Double
    let scoreAfter: Double
    let scoreDelta: Double

    @State private var animatedBefore: Double = 0
    @State private var animatedAfter: Double = 0

    var body: some View {
        VStack(spacing: 16) {
            Text(localization.t("zehAni.v2v.beforeAfter"))
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)

            scoreComparisonBars

            improvementIndicator
        }
        .padding(20)
        .background(.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(.white.opacity(0.1), lineWidth: 1)
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8)) {
                animatedBefore = scoreBefore
                animatedAfter = scoreAfter
            }
        }
    }

    @ViewBuilder
    private var scoreComparisonBars: some View {
        VStack(spacing: 12) {
            scoreBar(
                label: localization.t("zehAni.v2v.before"),
                score: animatedBefore,
                color: DesignTokens.Colors.Semantic.warning
            )

            scoreBar(
                label: localization.t("zehAni.v2v.after"),
                score: animatedAfter,
                color: DesignTokens.Colors.Semantic.success
            )
        }
    }

    @ViewBuilder
    private func scoreBar(label: String, score: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.7))
                Spacer()
                Text("\(Int(score * 100))%")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(.white.opacity(0.1))

                    RoundedRectangle(cornerRadius: 4)
                        .fill(color)
                        .frame(width: geo.size.width * score)
                }
            }
            .frame(height: 8)
        }
    }

    @ViewBuilder
    private var improvementIndicator: some View {
        HStack(spacing: 6) {
            Image(systemName: scoreDelta > 0 ? "arrow.up.circle.fill" : "arrow.down.circle.fill")
                .foregroundColor(scoreDelta > 0 ? DesignTokens.Colors.Semantic.success : DesignTokens.Colors.Semantic.error)
                .font(.system(size: 20))

            Text("\(localization.t("zehAni.v2v.improvement")): \(formatDelta(scoreDelta))")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
        }
        .padding(.top, 8)
    }

    private func formatDelta(_ delta: Double) -> String {
        let sign = delta >= 0 ? "+" : ""
        return "\(sign)\(Int(delta * 100))%"
    }
}
