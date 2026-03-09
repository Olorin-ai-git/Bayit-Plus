import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct OnboardingVoiceSetupView: View {
    @Environment(LocalizationManager.self) var localization
    @Bindable var viewModel: OnboardingFlowViewModel
    let onContinue: () -> Void

    @State private var wavePhase: CGFloat = 0

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            waveformAnimation
                .frame(height: 120)

            Text(localization.t("onboarding.voice.title"))
                .font(.system(
                    size: DesignTokens.FontSize.xl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.voice.subtitle"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    voiceToggle
                    if viewModel.voiceEnabled {
                        wakeWordToggle
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .animation(
                .easeInOut(duration: 0.3),
                value: viewModel.voiceEnabled
            )

            Spacer()

            GlassButton(
                localization.t("onboarding.voice.continue"),
                variant: .primary,
                size: .large
            ) { onContinue() }

            Button {
                onContinue()
            } label: {
                Text(localization.t("onboarding.voice.later"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.bottom, DesignTokens.Spacing.xxl)
        .onAppear {
            withAnimation(
                .linear(duration: 2).repeatForever(autoreverses: false)
            ) {
                wavePhase = .pi * 2
            }
        }
    }

    private var voiceToggle: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "mic.fill")
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 32)

            Text(localization.t("onboarding.voice.enableVoice"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Toggle("", isOn: Binding(
                get: { viewModel.voiceEnabled },
                set: { viewModel.voiceEnabled = $0 }
            ))
            .tint(DesignTokens.Primary.default)
            .labelsHidden()
        }
    }

    private var wakeWordToggle: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "text.bubble.fill")
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 32)

            Text(localization.t("onboarding.voice.wakeWord"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Toggle("", isOn: Binding(
                get: { viewModel.wakeWordEnabled },
                set: { viewModel.wakeWordEnabled = $0 }
            ))
            .tint(DesignTokens.Primary.default)
            .labelsHidden()
        }
    }

    private var waveformAnimation: some View {
        Canvas { context, size in
            let midY = size.height / 2
            let barCount = 30
            let barWidth: CGFloat = 4
            let spacing = (size.width - barWidth * CGFloat(barCount))
                / CGFloat(barCount - 1)

            for i in 0 ..< barCount {
                let x = CGFloat(i) * (barWidth + spacing)
                let normalizedI = CGFloat(i) / CGFloat(barCount)
                let wave = sin(normalizedI * .pi * 3 + wavePhase)
                let amplitude = size.height * 0.35 * (
                    viewModel.voiceEnabled ? 1.0 : 0.3
                )
                let barHeight = max(barWidth, abs(wave) * amplitude)

                let rect = CGRect(
                    x: x,
                    y: midY - barHeight / 2,
                    width: barWidth,
                    height: barHeight
                )
                let path = Path(
                    roundedRect: rect,
                    cornerRadius: barWidth / 2
                )
                context.fill(
                    path,
                    with: .color(
                        Color(
                            hue: 0.75 + normalizedI * 0.1,
                            saturation: 0.7,
                            brightness: 0.8
                        ).opacity(0.6 + abs(wave) * 0.4)
                    )
                )
            }
        }
    }
}
