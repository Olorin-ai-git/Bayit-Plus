import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI

// MARK: - Language Card Helper

extension VoiceLanguageSelectStep {
    func languageCard(_ language: SupportedLanguage) -> some View {
        let isSelected = selectedLanguage == language

        return Button {
            selectedLanguage = language
        } label: {
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(language.displayName)
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(
                        isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary
                    )

                Text(language.nativeName)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.base)
            .background {
                ZStack {
                    Color.black.opacity(isSelected ? 0.4 : 0.6)
                    VisualEffectBlur(style: .systemUltraThinMaterialDark)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Glass.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
    }
}
