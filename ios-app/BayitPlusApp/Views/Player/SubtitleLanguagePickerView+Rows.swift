import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - SubtitleLanguagePickerView Row Views

extension SubtitleLanguagePickerView {
    var offRow: some View {
        Button {
            onSelect(nil)
            dismissPicker()
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "slash.circle")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(localization.t("player.subtitlesOff"))
                    .font(.system(
                        size: DesignTokens.FontSize.md, weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if selectedLanguage == nil {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(rowBackground(isSelected: selectedLanguage == nil))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(localization.t("player.subtitlesOff"))
        .accessibilityValue(selectedLanguage == nil ? "Selected" : "")
    }

    func languageRow(_ item: PickerItem) -> some View {
        let isSelected = isItemSelected(item)
        let isAvailable = isItemAvailable(item)

        return Button {
            handleItemTap(item, isAvailable: isAvailable)
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Text(item.languageInfo.emojiFlag)
                    .font(.system(size: 24))

                Text(item.languageInfo.badge)
                    .font(.system(
                        size: DesignTokens.FontSize.sm, weight: .bold
                    ))
                    .foregroundStyle(.white)
                    .frame(width: 32, height: 24)
                    .background(DesignTokens.Primary.p700)
                    .clipShape(RoundedRectangle(
                        cornerRadius: DesignTokens.Radius.sm
                    ))

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Text(item.displayLabel)
                            .font(.system(
                                size: DesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if item.isAI {
                            Image(
                                systemName: isAvailable
                                    ? "sparkles" : "lock.fill"
                            )
                            .font(.system(size: 12))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        }
                    }

                    Text(item.secondaryLabel)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(rowBackground(isSelected: isSelected))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "\(item.displayLabel) subtitles\(item.isAI ? ", AI generated" : "")"
        )
        .accessibilityValue(isSelected ? "Selected" : "")
    }

    func handleItemTap(_ item: PickerItem, isAvailable: Bool) {
        if item.isAI, !isAvailable {
            if let hm = item.hebrewMode, hm != .standard {
                selectedModeForGeneration = ModeSelectionItem(
                    language: "he", mode: hm
                )
            } else if item.englishMode == .engrew {
                onEnglishModeSelect?(.standard)
                dismissPicker()
            }
            return
        }

        onSelect(item.languageInfo.code)
        if let hm = item.hebrewMode { onHebrewModeSelect?(hm) }
        if let em = item.englishMode { onEnglishModeSelect?(em) }
        dismissPicker()
    }

    func splitRow(onSplitTap: @escaping () -> Void) -> some View {
        Group {
            Divider()
                .background(DesignTokens.Text.muted.opacity(0.3))
                .padding(.vertical, DesignTokens.Spacing.sm)

            Button {
                onSplitTap()
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(
                        systemName: "text.line.first.and.arrowtriangle.forward"
                    )
                    .font(.system(size: 22))
                    .foregroundStyle(DesignTokens.Primary.p400)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(localization.t("subtitles.splitDisplay"))
                            .font(.system(
                                size: DesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t(
                            "subtitles.splitDisplayDescription"
                        ))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                    }

                    Spacer()

                    if isSplitEnabled {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.md)
                .background(rowBackground(isSelected: isSplitEnabled))
                .clipShape(RoundedRectangle(
                    cornerRadius: DesignTokens.Radius.md
                ))
            }
            .buttonStyle(.plain)
        }
    }
}
