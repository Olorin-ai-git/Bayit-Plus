import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Language Row, Preview & Helpers

extension SplitSubtitleLanguagePickerView {
    func languageRow(_ lang: String) -> some View {
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

    var previewView: some View {
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

    func previewPane(language: String, position: String) -> some View {
        let langInfo = getLanguageInfo(for: language)
        return VStack(spacing: 4) {
            Text(langInfo?.flag ?? "")
                .font(.system(size: 28))

            Text(position)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(DesignTokens.Text.muted)
                .tracking(0.5)
        }
        .frame(maxWidth: .infinity)
    }

    func toggleLanguageSelection(_ lang: String) {
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
struct SplitModeToggleView: View {
    @Environment(LocalizationManager.self) private var localization
    @Binding var isEnabled: Bool

    var body: some View {
        HStack {
            Image(systemName: "square.split.2x1")
                .font(.system(size: 18))
                .foregroundColor(.purple)

            VStack(alignment: .leading, spacing: 2) {
                Text(localization.t("subtitles.splitScreenLabel"))
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)

                Text(localization.t("subtitles.splitDisplayDescription"))
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
func getLanguageInfo(for code: String) -> SplitLanguageInfo? {
    let languages: [String: SplitLanguageInfo] = [
        "he": SplitLanguageInfo(nativeName: "עברית", flag: "🇮🇱"),
        "en": SplitLanguageInfo(nativeName: "English", flag: "🇺🇸"),
        "es": SplitLanguageInfo(nativeName: "Español", flag: "🇪🇸"),
        "ar": SplitLanguageInfo(nativeName: "العربية", flag: "🇸🇦"),
        "ru": SplitLanguageInfo(nativeName: "Русский", flag: "🇷🇺"),
        "fr": SplitLanguageInfo(nativeName: "Français", flag: "🇫🇷"),
        "de": SplitLanguageInfo(nativeName: "Deutsch", flag: "🇩🇪"),
        "it": SplitLanguageInfo(nativeName: "Italiano", flag: "🇮🇹"),
        "pt": SplitLanguageInfo(nativeName: "Português", flag: "🇵🇹"),
        "yi": SplitLanguageInfo(nativeName: "ייִדיש", flag: "🕍"),
    ]
    return languages[code]
}

struct SplitLanguageInfo {
    let nativeName: String
    let flag: String
}
