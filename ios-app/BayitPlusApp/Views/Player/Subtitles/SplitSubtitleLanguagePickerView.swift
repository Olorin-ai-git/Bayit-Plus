import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Modal for selecting two languages for split screen subtitle mode.
/// Allows users to choose which languages appear on left and right sides.
/// Language rows and preview components are in SplitSubtitleLanguageRow.swift.
struct SplitSubtitleLanguagePickerView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization

    let availableLanguages: [String]
    let sourceLanguage: String
    @Binding var selectedLanguages: [String]
    @Binding var splitModeEnabled: Bool
    @Binding var layout: SplitSubtitleLayout
    let onConfirm: ([String]) -> Void

    @State var tempSelection: [String] = []

    var targetLanguages: [String] {
        availableLanguages.filter { $0 != sourceLanguage }
    }

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            // Header
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(localization.t("subtitles.selectTwoLanguages"))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)

                Text(localization.t("subtitles.selectTwoLanguagesDescription"))
                    .font(.system(size: 13))
                    .foregroundColor(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, DesignTokens.Spacing.lg)

            // Split mode toggle
            SplitModeToggleView(isEnabled: $splitModeEnabled)
                .padding(.horizontal, DesignTokens.Spacing.md)

            // Layout toggle
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(SplitSubtitleLayout.allCases, id: \.self) { layoutOption in
                    GlassChip(
                        title: layoutOption.label,
                        isSelected: layout == layoutOption
                    ) {
                        layout = layoutOption
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)

            // Language list
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.xs) {
                    ForEach(targetLanguages, id: \.self) { lang in
                        languageRow(lang)
                    }
                }
            }

            // Preview (when 2 languages selected)
            if tempSelection.count == 2 {
                previewView
            }

            // Confirm button
            Button {
                onConfirm(tempSelection)
                dismiss()
            } label: {
                Text(localization.t("subtitles.startSplitScreen"))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.md)
                    .background(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .fill(tempSelection.count == 2 ? DesignTokens.Primary.p500 : Color.gray.opacity(0.3))
                    )
            }
            .disabled(tempSelection.count != 2)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.lg)
        }
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
                .fill(Color.black.opacity(0.95))
        )
        .onAppear {
            tempSelection = selectedLanguages
        }
    }
}
