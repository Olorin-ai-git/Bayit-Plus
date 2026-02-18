import BayitDesignSystem
import BayitLocalization
import SwiftUI

enum VoiceMode: String, CaseIterable, Identifiable {
    case full, compact, minimal
    var id: String { rawValue }

    var icon: String {
        switch self {
        case .full: return "bubble.left.and.bubble.right"
        case .compact: return "rectangle.compress.vertical"
        case .minimal: return "mic"
        }
    }

    func descriptionKey() -> String {
        switch self {
        case .full: return "voice.mode.fullDesc"
        case .compact: return "voice.mode.compactDesc"
        case .minimal: return "voice.mode.minimalDesc"
        }
    }
}

/// Selectable card grid for choosing voice assistant display mode.
struct VoiceModeSelector: View {
    @Environment(LocalizationManager.self) private var localization
    @Binding var selectedMode: VoiceMode

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(VoiceMode.allCases) { mode in
                modeCard(mode)
            }
        }
    }

    private func modeCard(_ mode: VoiceMode) -> some View {
        let isSelected = selectedMode == mode
        return Button { selectedMode = mode } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: mode.icon)
                    .font(.system(size: 22))
                    .foregroundStyle(isSelected ? DesignTokens.Primary.p400 : DesignTokens.Text.muted)
                    .frame(width: 32)
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(localization.t("voice.mode.\(mode.rawValue)"))
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t(mode.descriptionKey()))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .glassCard(radius: DesignTokens.Radius.md, padding: 0)
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(isSelected ? DesignTokens.Primary.default : .clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(localization.t("voice.mode.\(mode.rawValue)"))
        .accessibilityValue(isSelected ? localization.t("common.selected") : "")
    }
}
