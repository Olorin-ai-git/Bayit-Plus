import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Enhanced language picker with AI mode selection for Hebrew and English learning modes.
/// Mirrors web's SubtitleLanguageList component.
struct SubtitleModePicker: View {
    let language: String
    let currentHebrewMode: SubtitleHebrewMode
    let currentEnglishMode: SubtitleEnglishMode
    let availableModes: SubtitleCue?
    let onHebrewModeSelect: (SubtitleHebrewMode) -> Void
    let onEnglishModeSelect: (SubtitleEnglishMode) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    if language == "he" {
                        hebrewModesSection
                    } else if language == "en" {
                        englishModesSection
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("subtitles.modes"))
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

    // MARK: - Hebrew Modes Section

    private var hebrewModesSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("subtitles.hebrewLearningModes"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ForEach(SubtitleHebrewMode.allCases, id: \.self) { mode in
                modeCard(
                    mode: mode,
                    isSelected: mode == currentHebrewMode,
                    isDisabled: !isModeAvailable(mode),
                    isAIGenerated: isAIMode(mode),
                    onSelect: {
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                        onHebrewModeSelect(mode)
                        dismiss()
                    }
                )
            }
        }
    }

    // MARK: - English Modes Section

    private var englishModesSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("subtitles.englishLearningModes"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ForEach(SubtitleEnglishMode.allCases, id: \.self) { mode in
                modeCard(
                    mode: mode,
                    isSelected: mode == currentEnglishMode,
                    isDisabled: !isModeAvailable(mode),
                    isAIGenerated: isAIMode(mode),
                    onSelect: {
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                        onEnglishModeSelect(mode)
                        dismiss()
                    }
                )
            }
        }
    }

    // MARK: - Mode Card

    private func modeCard<T: RawRepresentable & CaseIterable>(
        mode: T,
        isSelected: Bool,
        isDisabled: Bool,
        isAIGenerated: Bool,
        onSelect: @escaping () -> Void
    ) -> some View where T.RawValue == String {
        Button(action: onSelect) {
            GlassCard {
                HStack(spacing: DesignTokens.Spacing.md) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        HStack {
                            Text(displayName(for: mode))
                                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                                .foregroundStyle(DesignTokens.Text.primary)

                            if isAIGenerated {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 12))
                                    .foregroundStyle(DesignTokens.Primary.p400)
                            }
                        }

                        Text(description(for: mode))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Spacer()

                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .font(.system(size: 24))
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.5 : 1.0)
        .accessibilityLabel("\(displayName(for: mode)) mode")
        .accessibilityHint(description(for: mode))
        .accessibilityValue(isSelected ? "Selected" : "")
    }

    // MARK: - Helpers

    private func isModeAvailable<T: RawRepresentable>(_ mode: T) -> Bool where T.RawValue == String {
        guard let cue = availableModes else { return true }

        if let hebrewMode = mode as? SubtitleHebrewMode {
            switch hebrewMode {
            case .standard: return true
            case .nikud: return cue.textNikud != nil
            case .shoresh: return cue.hasShoreshVersion == true
            case .heblish: return cue.hasHeblishVersion == true
            }
        } else if let englishMode = mode as? SubtitleEnglishMode {
            switch englishMode {
            case .standard: return true
            case .engrew: return cue.hasEngrewVersion == true
            }
        }

        return true
    }

    private func isAIMode<T: RawRepresentable>(_ mode: T) -> Bool where T.RawValue == String {
        if let hebrewMode = mode as? SubtitleHebrewMode {
            return hebrewMode == .nikud || hebrewMode == .shoresh || hebrewMode == .heblish
        } else if let englishMode = mode as? SubtitleEnglishMode {
            return englishMode == .engrew
        }
        return false
    }

    private func displayName<T: RawRepresentable>(for mode: T) -> String where T.RawValue == String {
        if let hebrewMode = mode as? SubtitleHebrewMode {
            return hebrewMode.displayName
        } else if let englishMode = mode as? SubtitleEnglishMode {
            return englishMode.displayName
        }
        return ""
    }

    private func description<T: RawRepresentable>(for mode: T) -> String where T.RawValue == String {
        if let hebrewMode = mode as? SubtitleHebrewMode {
            return hebrewMode.description
        } else if let englishMode = mode as? SubtitleEnglishMode {
            return englishMode.description
        }
        return ""
    }
}
