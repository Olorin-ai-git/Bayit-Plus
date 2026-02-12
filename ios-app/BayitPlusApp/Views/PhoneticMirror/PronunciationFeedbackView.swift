import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct PronunciationFeedbackView: View {
    @Environment(LocalizationManager.self) private var localization
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
        switch issue {
        case "stress_wrong":
            return localization.t("phoneticMirror.issues.stressWrong")
        case "vowel_swap":
            return localization.t("phoneticMirror.issues.vowelSwap")
        case "consonant_swap":
            return localization.t("phoneticMirror.issues.consonantSwap")
        case "missing_sound":
            return localization.t("phoneticMirror.issues.missingSound")
        case "extra_sound":
            return localization.t("phoneticMirror.issues.extraSound")
        default:
            return issue
        }
    }
}
