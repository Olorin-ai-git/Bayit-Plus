#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full language picker sheet for selecting the unified AI target language.
///
/// Always shows all available languages from `SubtitleLanguages.all` with flags and names.
/// Includes a "Split Screen" button that toggles dual-selection mode for choosing a
/// secondary language used in split subtitles.
struct GlassAILanguagePickerView: View {

    let selectedLanguage: String
    let secondaryLanguage: String?
    let onSelectLanguage: (String) -> Void
    let onSelectSecondaryLanguage: ((String) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization
    @State private var isSplitSelectionMode = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    splitScreenToggle
                    if isSplitSelectionMode {
                        sectionHeader(localization.t("player.primaryLanguage"))
                    }
                    primaryLanguageList
                    if isSplitSelectionMode {
                        secondaryLanguageSection
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("player.selectOutputLanguage"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { dismissButton }
            }
        }
        .environment(\.layoutDirection, localization.layoutDirection)
    }

    // MARK: - Split Screen Toggle

    private var splitScreenToggle: some View {
        Button {
            withAnimation(.spring(duration: 0.25)) {
                isSplitSelectionMode.toggle()
            }
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "square.split.2x1")
                    .font(.system(size: 14, weight: .semibold))
                Text(localization.t("subtitles.splitScreen.title"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                Spacer()
                Image(systemName: isSplitSelectionMode ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(
                        isSplitSelectionMode
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Text.muted
                    )
            }
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(DesignTokens.Spacing.md)
            .background(splitToggleBackground)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .padding(.bottom, DesignTokens.Spacing.sm)
    }

    private var splitToggleBackground: some View {
        ZStack {
            if isSplitSelectionMode {
                DesignTokens.Primary.p900.opacity(0.3)
            } else {
                DesignTokens.Glass.bg
            }
            VisualEffectBlur(style: .systemUltraThinMaterialDark)
        }
    }

    // MARK: - Primary Language List

    private var primaryLanguageList: some View {
        ForEach(SubtitleLanguages.all, id: \.code) { info in
            languageRow(
                info: info,
                isSelected: info.code == selectedLanguage,
                onSelect: { code in
                    onSelectLanguage(code)
                    if !isSplitSelectionMode { dismiss() }
                }
            )
        }
    }

    // MARK: - Secondary Language Section

    private var secondaryLanguageSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Divider()
                .background(DesignTokens.Text.muted.opacity(0.3))
                .padding(.vertical, DesignTokens.Spacing.sm)
            sectionHeader(localization.t("player.secondaryLanguage"))
            Text(localization.t("player.dualLanguageHint"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(.horizontal, DesignTokens.Spacing.xs)
            ForEach(secondaryLanguageRows, id: \.code) { info in
                languageRow(
                    info: info,
                    isSelected: info.code == secondaryLanguage,
                    onSelect: { code in onSelectSecondaryLanguage?(code) }
                )
            }
        }
    }

    // MARK: - Language Row

    private func languageRow(
        info: SubtitleLanguageInfo,
        isSelected: Bool,
        onSelect: @escaping (String) -> Void
    ) -> some View {
        Button { onSelect(info.code) } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                badgeView(info.badge)
                VStack(alignment: .leading, spacing: 2) {
                    Text(info.nativeName)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(info.name)
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
        .accessibilityLabel("\(info.name)")
        .accessibilityValue(isSelected ? "Selected" : "")
    }

    // MARK: - Subviews

    private func badgeView(_ badge: String) -> some View {
        Text(badge)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 32, height: 24)
            .background(DesignTokens.Primary.p700)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.xs)
    }

    private var dismissButton: some View {
        Button { dismiss() } label: {
            Image(systemName: "xmark.circle.fill")
                .foregroundStyle(DesignTokens.Text.secondary)
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel(localization.t("common.close"))
    }

    // MARK: - Helpers

    private var secondaryLanguageRows: [SubtitleLanguageInfo] {
        SubtitleLanguages.all.filter { $0.code != selectedLanguage }
    }

    private func rowBackground(isSelected: Bool) -> some View {
        ZStack {
            if isSelected {
                DesignTokens.Primary.p900.opacity(0.3)
            } else {
                DesignTokens.Glass.bg
            }
            VisualEffectBlur(style: .systemUltraThinMaterialDark)
        }
    }
}
#endif
