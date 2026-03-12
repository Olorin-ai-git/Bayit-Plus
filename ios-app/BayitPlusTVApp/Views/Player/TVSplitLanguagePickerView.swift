import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS split subtitle language picker for selecting two languages (with AI variant support)
/// for side-by-side display. Expands "he" into Nikud/Shoresh/Heblish variants and "en" into
/// Engrew when the respective flags indicate those AI-generated variants are available.
struct TVSplitLanguagePickerView: View {
    @Environment(LocalizationManager.self) private var localization
    let availableLanguages: [String]
    let selectedLanguages: [String]
    @Binding var layout: SplitSubtitleLayout
    var hasNikud: Bool = false
    var hasShoresh: Bool = false
    var hasHeblish: Bool = false
    var hasEngrew: Bool = false
    let onConfirm: ([SubtitlePickerItem]) -> Void
    let onDismiss: () -> Void

    @State private var primaryItem: SubtitlePickerItem?
    @State private var secondaryItem: SubtitlePickerItem?

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(localization.t("subtitles.splitDisplay"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("subtitles.selectTwoLanguages"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)

            layoutToggle

            HStack(alignment: .top, spacing: TVDesignTokens.Spacing.xxxxl) {
                languageColumn(title: "Primary", current: $primaryItem)
                languageColumn(title: "Secondary", current: $secondaryItem)
            }
            .padding(.vertical, TVDesignTokens.Spacing.md)

            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                Button {
                    onDismiss()
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .medium))
                        Text(localization.t("common.cancel"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    }
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 180)
                    .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                }
                .tvCardStyle()

                Button {
                    guard let p = primaryItem, let s = secondaryItem else { return }
                    onConfirm([p, s])
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 18, weight: .medium))
                        Text(localization.t("common.confirm"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    }
                    .foregroundStyle(.white)
                    .frame(width: 180)
                    .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                    .background(DesignTokens.Primary.p500.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .tvCardStyle()
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 1100)
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
        .onAppear { initializeSelections() }
    }

    // MARK: - Layout Toggle

    private var layoutToggle: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(SplitSubtitleLayout.allCases, id: \.self) { option in
                GlassChip(title: localization.t(option.localizationKey), isSelected: layout == option) {
                    layout = option
                }
                .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            }
        }
    }

    // MARK: - Language Column

    private func languageColumn(
        title: String,
        current: Binding<SubtitlePickerItem?>
    ) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ScrollView {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(allPickerItems) { item in
                        let isSelected = current.wrappedValue?.id == item.id
                        Button {
                            current.wrappedValue = item
                        } label: {
                            HStack(spacing: TVDesignTokens.Spacing.md) {
                                Text(item.languageInfo.emojiFlag)
                                    .font(.system(size: 28))

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.displayLabel)
                                        .font(.system(size: TVDesignTokens.FontSize.md))
                                        .foregroundStyle(DesignTokens.Text.primary)
                                        .lineLimit(1)
                                    if item.isAI {
                                        Text(item.secondaryLabel)
                                            .font(.system(size: TVDesignTokens.FontSize.sm))
                                            .foregroundStyle(DesignTokens.Text.muted)
                                            .lineLimit(1)
                                    }
                                }

                                Spacer()

                                if isSelected {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 24))
                                        .foregroundStyle(DesignTokens.Primary.p400)
                                }
                            }
                            .frame(width: 360)
                            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                        }
                        .tvCardStyle()
                    }
                }
            }
            .frame(maxHeight: 600)
        }
    }

    // MARK: - Helpers

    private func pickerItems(for code: String) -> [SubtitlePickerItem] {
        guard let info = SubtitleLanguages.info(for: code) else { return [] }
        switch code {
        case "he":
            var items = [SubtitlePickerItem(languageInfo: info, hebrewMode: .standard, englishMode: nil)]
            if hasNikud { items.append(.init(languageInfo: info, hebrewMode: .nikud, englishMode: nil)) }
            if hasShoresh { items.append(.init(languageInfo: info, hebrewMode: .shoresh, englishMode: nil)) }
            if hasHeblish { items.append(.init(languageInfo: info, hebrewMode: .heblish, englishMode: nil)) }
            return items
        case "en":
            var items = [SubtitlePickerItem(languageInfo: info, hebrewMode: nil, englishMode: .standard)]
            if hasEngrew { items.append(.init(languageInfo: info, hebrewMode: nil, englishMode: .engrew)) }
            return items
        default:
            return [SubtitlePickerItem(languageInfo: info, hebrewMode: nil, englishMode: nil)]
        }
    }

    var allPickerItems: [SubtitlePickerItem] {
        availableLanguages.flatMap { pickerItems(for: $0) }
    }

    private func initializeSelections() {
        let items = allPickerItems
        if selectedLanguages.count >= 2 {
            primaryItem = items.first { $0.languageInfo.code == selectedLanguages[0] && !$0.isAI }
                ?? items.first { $0.languageInfo.code == selectedLanguages[0] }
            secondaryItem = items.first { $0.languageInfo.code == selectedLanguages[1] && !$0.isAI }
                ?? items.first { $0.languageInfo.code == selectedLanguages[1] }
        } else {
            primaryItem = items.first { $0.languageInfo.code == "he" && !$0.isAI } ?? items.first
            secondaryItem = items.first {
                $0.languageInfo.code != primaryItem?.languageInfo.code && !$0.isAI
            }
        }
    }
}
