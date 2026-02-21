import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Off Button

struct TVSubtitleOffButton: View {
    @Environment(LocalizationManager.self) private var localization
    let selectedLanguage: String?
    let onSelect: (String?) -> Void
    let onDismiss: () -> Void

    var body: some View {
        Button {
            onSelect(nil)
            onDismiss()
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "slash.circle")
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(localization.t("subtitles.off"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.md, weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if selectedLanguage == nil {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
        }
        .buttonStyle(.card)
    }
}

// MARK: - Language Button

struct TVSubtitleLanguageButton: View {
    let item: SubtitlePickerItem
    let isSelected: Bool
    let isAvailable: Bool
    let isGenerating: Bool
    let jobProgress: Int
    let onTap: () -> Void

    var body: some View {
        Button {
            onTap()
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Text(item.languageInfo.emojiFlag)
                    .font(.system(size: 28))

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Text(item.displayLabel)
                            .font(.system(
                                size: TVDesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if item.isAI {
                            if isGenerating {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .tint(DesignTokens.Primary.p400)
                                    .scaleEffect(0.6)

                                Text("\(jobProgress)%")
                                    .font(.system(
                                        size: TVDesignTokens.FontSize.sm
                                    ))
                                    .foregroundStyle(
                                        DesignTokens.Primary.p400
                                    )
                            } else {
                                Image(
                                    systemName: isAvailable
                                        ? "sparkles" : "lock.fill"
                                )
                                .font(.system(size: 14))
                                .foregroundStyle(DesignTokens.Primary.p400)
                            }
                        }
                    }

                    Text(item.secondaryLabel)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
        }
        .buttonStyle(.card)
    }
}

// MARK: - Split Button

struct TVSubtitleSplitButton: View {
    @Environment(LocalizationManager.self) private var localization
    let isSplitEnabled: Bool
    let onSplitTap: () -> Void

    var body: some View {
        Group {
            Divider()
                .background(DesignTokens.Text.muted.opacity(0.3))
                .padding(.vertical, TVDesignTokens.Spacing.sm)

            Button {
                onSplitTap()
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(
                        systemName: "text.line.first.and.arrowtriangle.forward"
                    )
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Primary.p400)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(localization.t("subtitles.splitDisplay"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t("subtitles.twoLanguagesSideBySide"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }

                    Spacer()

                    if isSplitEnabled {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
            }
            .buttonStyle(.card)
        }
    }
}
