import BayitDesignSystem
import SwiftUI

struct PronunciationFeedbackView: View {
    let feedback: [PhonemeFeedbackItem]

    var body: some View {
        VStack(spacing: 6) {
            ForEach(feedback) { item in
                HStack {
                    Text(item.wordHe)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.white)

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(Int(item.score * 100))%")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(scoreColor(item.score))
                            .clipShape(RoundedRectangle(cornerRadius: 8))

                        if let issue = item.issueType {
                            Text(issueLabel(issue))
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.5))
                        }
                    }
                }
                .padding(.vertical, 10)
                .padding(.horizontal, 16)
                .background(scoreColor(item.score).opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func scoreColor(_ score: Double) -> Color {
        if score >= 0.9 { return DesignTokens.Color.success }
        if score >= 0.7 { return DesignTokens.Color.success.opacity(0.8) }
        if score >= 0.5 { return DesignTokens.Color.warning }
        return DesignTokens.Color.error
    }

    private func issueLabel(_ issue: String) -> String {
        let labels: [String: String] = [
            "stress_wrong": "Stress placement",
            "vowel_swap": "Vowel substitution",
            "consonant_swap": "Consonant mix-up",
            "missing_sound": "Missing sound",
            "extra_sound": "Extra sound",
        ]
        return labels[issue] ?? issue
    }
}
