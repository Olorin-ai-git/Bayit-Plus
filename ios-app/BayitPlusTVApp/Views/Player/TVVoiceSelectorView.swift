import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS voice selector for live dubbing. Presented as a full-screen cover
/// and dismissed via the Menu button on the Siri Remote. Each voice card
/// is a focusable Button with card styling for natural Siri Remote navigation.
struct TVVoiceSelectorView: View {
    @Environment(LocalizationManager.self) private var localization
    let voices: [DubbingVoice]
    let selectedVoice: DubbingVoice?
    let onSelect: (DubbingVoice) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                titleView
                headerView
                voiceList
            }
            .padding(TVDesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Title

    private var titleView: some View {
        Text(localization.t("voice.selectVoice"))
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Header

    private var headerView: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "waveform.circle")
                .font(.system(size: 30))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text("\(voices.count) \(localization.t("voice.voicesAvailable"))")
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Voice List

    private var voiceList: some View {
        VStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(voices) { voice in
                voiceCard(voice)
            }
        }
    }

    // MARK: - Voice Card

    private func voiceCard(_ voice: DubbingVoice) -> some View {
        let isSelected = voice.id == selectedVoice?.id
        return Button {
            onSelect(voice)
            dismiss()
        } label: {
            GlassCard {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(voice.name)
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        GlassBadge(text: voice.language.uppercased(), variant: .info)
                        if let description = voice.description {
                            Text(description)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    Spacer()
                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .padding(TVDesignTokens.Spacing.md)
            }
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .accessibilityLabel("\(voice.name) voice for \(voice.language)")
        .accessibilityValue(isSelected ? "Selected" : "")
        .accessibilityHint(voice.description ?? "")
    }
}
