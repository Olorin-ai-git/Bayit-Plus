import BayitDesignSystem
import SwiftUI
import UIKit

/// Voice selector sheet for live dubbing - displays available voices with language and description.
struct VoiceSelectorView: View {
    let voices: [DubbingVoice]
    let selectedVoice: DubbingVoice?
    let onSelect: (DubbingVoice) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.md) {
                    headerView

                    ForEach(voices) { voice in
                        voiceCard(voice)
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle("Select Voice")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Header

    private var headerView: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "waveform.circle")
                .font(.system(size: 24))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text("\(voices.count) voices available")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Voice Card

    private func voiceCard(_ voice: DubbingVoice) -> some View {
        let isSelected = voice.id == selectedVoice?.id

        return Button {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            onSelect(voice)
            dismiss()
        } label: {
            GlassCard {
                HStack(spacing: DesignTokens.Spacing.md) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        Text(voice.name)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        GlassBadge(
                            text: voice.language.uppercased(),
                            variant: .info
                        )

                        if let description = voice.description {
                            Text(description)
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }

                    Spacer()

                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(voice.name) voice for \(voice.language)")
        .accessibilityValue(isSelected ? "Selected" : "")
        .accessibilityHint(voice.description ?? "")
    }
}
