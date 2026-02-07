import BayitDesignSystem
import BayitVoice
import SwiftUI

/// Welcome step content for voice onboarding.
struct VoiceWelcomeStep: View {

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            voiceOrbIcon

            Text("Voice Control")
                .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Control your experience with your voice. Search, navigate, and play content hands-free.")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.base)

            featureList
        }
    }

    private var featureList: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            featureRow(icon: "magnifyingglass", text: "Search with your voice")
            featureRow(icon: "play.circle", text: "Control playback hands-free")
            featureRow(icon: "globe", text: "Speak in multiple languages")
            featureRow(icon: "waveform", text: "Real-time dubbing control")
        }
        .padding(.top, DesignTokens.Spacing.base)
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 36, height: 36)

            Text(text)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()
        }
        .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md)
    }

    private var voiceOrbIcon: some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Glass.purpleLight)
                .frame(width: 120, height: 120)

            Circle()
                .fill(DesignTokens.Glass.purpleStrong)
                .frame(width: 80, height: 80)

            Image(systemName: "waveform")
                .font(.system(size: 36, weight: .medium))
                .foregroundStyle(DesignTokens.Primary.p300)
        }
    }
}

/// Permissions step content for voice onboarding.
struct VoicePermissionsStep: View {

    let permissions: VoicePermissions

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "lock.shield")
                .font(.system(size: 56))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text("Permissions Required")
                .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Voice features need access to your microphone and speech recognition.")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.base)

            VStack(spacing: DesignTokens.Spacing.md) {
                permissionRow(icon: "mic", title: "Microphone", granted: permissions.microphone)
                permissionRow(
                    icon: "waveform.badge.mic",
                    title: "Speech Recognition",
                    granted: permissions.speechRecognition
                )
            }
            .padding(.top, DesignTokens.Spacing.sm)
        }
    }

    private func permissionRow(icon: String, title: String, granted: Bool) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(granted ? DesignTokens.Success.default : DesignTokens.Text.muted)
                .frame(width: 36, height: 36)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Image(systemName: granted ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 22))
                .foregroundStyle(
                    granted ? DesignTokens.Success.default : DesignTokens.Text.disabled
                )
        }
        .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md)
    }
}

/// Language selection step content for voice onboarding.
struct VoiceLanguageSelectStep: View {

    @Binding var selectedLanguage: SupportedLanguage
    let availableLanguages: [SupportedLanguage]

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "globe")
                .font(.system(size: 56))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text("Choose Language")
                .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Select your preferred language for voice commands.")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            languageGrid
        }
    }

    private var languageGrid: some View {
        LazyVGrid(
            columns: [GridItem(.flexible()), GridItem(.flexible())],
            spacing: DesignTokens.Spacing.md
        ) {
            ForEach(availableLanguages) { language in
                languageCard(language)
            }
        }
    }

    private func languageCard(_ language: SupportedLanguage) -> some View {
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
