import BayitDesignSystem
import SwiftUI

/// Modal for selecting two languages for split screen subtitle mode.
/// Allows users to choose which languages appear on left and right sides.
struct SplitSubtitleLanguagePickerView: View {
    @Environment(\.dismiss) private var dismiss

    let availableLanguages: [String]
    let sourceLanguage: String
    @Binding var selectedLanguages: [String]
    @Binding var splitModeEnabled: Bool
    let onConfirm: ([String]) -> Void

    @State private var tempSelection: [String] = []

    private var targetLanguages: [String] {
        availableLanguages.filter { $0 != sourceLanguage }
    }

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            // Header
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text("Select Two Languages")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)

                Text("Choose two languages for split screen subtitles")
                    .font(.system(size: 13))
                    .foregroundColor(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, DesignTokens.Spacing.lg)

            // Split mode toggle
            SplitModeToggleView(isEnabled: $splitModeEnabled)
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
                Text("Start Split Screen")
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

    private func languageRow(_ lang: String) -> some View {
        let langInfo = getLanguageInfo(for: lang)
        let isSelected = tempSelection.contains(lang)
        let selectionIndex = tempSelection.firstIndex(of: lang)

        return Button {
            toggleLanguageSelection(lang)
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                // Flag
                Text(langInfo?.flag ?? "")
                    .font(.system(size: 20))

                // Native name
                Text(langInfo?.nativeName ?? lang.uppercased())
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Position badge (LEFT/RIGHT)
                if let index = selectionIndex {
                    Text(index == 0 ? "LEFT" : "RIGHT")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(DesignTokens.Primary.p500)
                        )
                }

                // Checkmark
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(DesignTokens.Primary.p500)
                }
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .fill(isSelected ? Color.purple.opacity(0.3) : Color.black.opacity(0.3))
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .stroke(isSelected ? Color.purple.opacity(0.5) : Color.purple.opacity(0.2), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private var previewView: some View {
        HStack(alignment: .center, spacing: 0) {
            // Left preview
            previewPane(language: tempSelection[0], position: "LEFT")

            // Divider
            Rectangle()
                .fill(Color.white.opacity(0.25))
                .frame(width: 2, height: 40)
                .cornerRadius(1)

            // Right preview
            previewPane(language: tempSelection[1], position: "RIGHT")
        }
        .padding(.vertical, DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(Color.black.opacity(0.4))
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func previewPane(language: String, position: String) -> some View {
        let langInfo = getLanguageInfo(for: language)
        return VStack(spacing: 4) {
            Text(langInfo?.flag ?? "")
                .font(.system(size: 28))

            Text(position)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(DesignTokens.Text.muted)
                .letterSpacing(0.5)
        }
        .frame(maxWidth: .infinity)
    }

    private func toggleLanguageSelection(_ lang: String) {
        if tempSelection.contains(lang) {
            tempSelection.removeAll { $0 == lang }
        } else if tempSelection.count >= 2 {
            // Replace first language
            tempSelection = [tempSelection[1], lang]
        } else {
            tempSelection.append(lang)
        }
    }
}

/// Split mode toggle switch component.
private struct SplitModeToggleView: View {
    @Binding var isEnabled: Bool

    var body: some View {
        HStack {
            Image(systemName: "square.split.2x1")
                .font(.system(size: 18))
                .foregroundColor(.purple)

            VStack(alignment: .leading, spacing: 2) {
                Text("Split Screen")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)

                Text("Show two languages side-by-side")
                    .font(.system(size: 12))
                    .foregroundColor(DesignTokens.Text.muted)
            }

            Spacer()

            Toggle("", isOn: $isEnabled)
                .labelsHidden()
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(Color.purple, lineWidth: 2)
        )
    }
}

/// Helper to get language information
private func getLanguageInfo(for code: String) -> LanguageInfo? {
    let languages: [String: LanguageInfo] = [
        "he": LanguageInfo(nativeName: "עברית", flag: "🇮🇱"),
        "en": LanguageInfo(nativeName: "English", flag: "🇺🇸"),
        "es": LanguageInfo(nativeName: "Español", flag: "🇪🇸"),
        "ar": LanguageInfo(nativeName: "العربية", flag: "🇸🇦"),
        "ru": LanguageInfo(nativeName: "Русский", flag: "🇷🇺"),
        "fr": LanguageInfo(nativeName: "Français", flag: "🇫🇷"),
        "de": LanguageInfo(nativeName: "Deutsch", flag: "🇩🇪"),
        "it": LanguageInfo(nativeName: "Italiano", flag: "🇮🇹"),
        "pt": LanguageInfo(nativeName: "Português", flag: "🇵🇹"),
        "yi": LanguageInfo(nativeName: "ייִדיש", flag: "🕍"),
    ]
    return languages[code]
}

private struct LanguageInfo {
    let nativeName: String
    let flag: String
}
