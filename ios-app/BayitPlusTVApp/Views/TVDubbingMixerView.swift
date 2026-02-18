import BayitDesignSystem
import SwiftUI

/// tvOS-optimized dubbing volume mixer with focus-based slider controls
/// for Siri Remote navigation.
struct TVDubbingMixerView: View {
    @Binding var originalVolume: Float
    @Binding var dubbedVolume: Float
    let latencyMs: Int?

    @FocusState private var focusedSlider: SliderFocus?

    private enum SliderFocus: Hashable {
        case original
        case dubbed
    }

    var body: some View {
        GlassCard(radius: DesignTokens.Radius.lg, padding: TVDesignTokens.Spacing.lg) {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(String(localized: "dubbing.mixer.title"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                TVVolumeRow(
                    label: String(localized: "dubbing.mixer.originalAudio"),
                    iconName: "speaker.wave.2",
                    value: $originalVolume,
                    isFocused: focusedSlider == .original
                )
                .focused($focusedSlider, equals: .original)

                TVVolumeRow(
                    label: String(localized: "dubbing.mixer.dubbedAudio"),
                    iconName: "waveform",
                    value: $dubbedVolume,
                    isFocused: focusedSlider == .dubbed
                )
                .focused($focusedSlider, equals: .dubbed)

                if let latencyMs {
                    HStack {
                        Spacer()
                        Text(String(localized: "dubbing.mixer.latency \(latencyMs)"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
        }
        .frame(maxWidth: 600)
    }
}

private struct TVVolumeRow: View {
    let label: String
    let iconName: String
    @Binding var value: Float
    let isFocused: Bool

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            HStack {
                Image(systemName: iconName)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(
                        isFocused ? DesignTokens.Primary.light : DesignTokens.Text.secondary
                    )

                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Text("\(Int(value * 100))%")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .monospacedDigit()
            }

            GlassProgressBar(progress: value)
                .overlay(
                    isFocused
                        ? RoundedRectangle(cornerRadius: DesignTokens.Radius.full)
                        .stroke(DesignTokens.Primary.light, lineWidth: 2)
                        : nil
                )
        }
        .padding(TVDesignTokens.Spacing.sm)
        .glassCard(radius: DesignTokens.Radius.md, padding: 0)
        .scaleEffect(isFocused ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.15), value: isFocused)
    }
}
