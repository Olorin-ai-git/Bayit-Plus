import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - TVPlayerControlBar + Subtitle Button

extension TVPlayerControlBar {
    var subtitleButton: some View {
        Button(action: onSubtitles) {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                ZStack {
                    Image(systemName: "captions.bubble")
                        .font(.system(size: 32, weight: .medium))
                        .foregroundStyle(hasActiveSubtitles
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Text.primary)

                    // Flag badges (contained within icon area)
                    if isSplitEnabled, splitLanguages.count == 2 {
                        HStack(spacing: 2) {
                            Text(flag(for: splitLanguages[0]))
                                .font(.system(size: 12))
                            Text(flag(for: splitLanguages[1]))
                                .font(.system(size: 12))
                        }
                        .padding(.horizontal, 3)
                        .padding(.vertical, 1)
                        .background(Color.black.opacity(0.7))
                        .clipShape(Capsule())
                        .offset(x: 18, y: -12)
                    } else if let lang = selectedSubtitleLanguage {
                        Text(flag(for: lang))
                            .font(.system(size: 14))
                            .padding(3)
                            .background(Color.black.opacity(0.7))
                            .clipShape(Circle())
                            .offset(x: 16, y: -12)
                    }
                }

                Text(localization.t("subtitles.title"))
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(hasActiveSubtitles
                        ? DesignTokens.Primary.p400
                        : DesignTokens.Text.primary)
            }
            .frame(width: 120, height: 80)
            .clipped()
        }
        .buttonStyle(PlayerControlButtonStyle())
        .accessibilityLabel(subtitleAccessibilityLabel)
    }

    var hasActiveSubtitles: Bool {
        selectedSubtitleLanguage != nil || isSplitEnabled
    }

    var subtitleAccessibilityLabel: String {
        if isSplitEnabled, splitLanguages.count == 2 {
            return "Subtitles: Split \(splitLanguages[0]) and \(splitLanguages[1])"
        }
        if let lang = selectedSubtitleLanguage {
            return "Subtitles: \(SubtitleLanguages.info(for: lang)?.name ?? lang)"
        }
        return "Subtitles: Off"
    }

    func flag(for code: String) -> String {
        SubtitleLanguages.info(for: code)?.emojiFlag ?? code
    }

    // MARK: - Control Button

    func controlButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 32, weight: .medium))
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
            }
            .foregroundStyle(DesignTokens.Text.primary)
            .frame(width: 120, height: 80)
        }
        .buttonStyle(PlayerControlButtonStyle())
        .accessibilityLabel(label)
    }
}
