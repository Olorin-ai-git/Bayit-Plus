#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full language picker sheet for selecting the unified AI target language.
///
/// Shows a single list of languages with flags and names.
/// A "Split Screen" toggle reveals checkboxes for multi-select (exactly 2 languages)
/// with a sticky "Confirm" button at the bottom.
struct GlassAILanguagePickerView: View {

    let selectedLanguage: String
    let secondaryLanguage: String?
    let onSelectLanguage: (String) -> Void
    let onSelectSecondaryLanguage: ((String) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization
    @State private var isSplitSelectionMode = false
    @State private var splitSelections: Set<String> = []

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        splitScreenToggle
                        if isSplitSelectionMode {
                            splitHint
                        }
                        languageList
                    }
                    .padding(DesignTokens.Spacing.lg)
                }

                if isSplitSelectionMode {
                    confirmButton
                }
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("player.selectOutputLanguage"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { dismissButton }
            }
        }
        .environment(\.layoutDirection, localization.layoutDirection)
        .onAppear { initializeSplitSelections() }
    }

    // MARK: - Split Screen Toggle

    private var splitScreenToggle: some View {
        Button {
            withAnimation(.spring(duration: 0.25)) {
                isSplitSelectionMode.toggle()
                if isSplitSelectionMode {
                    initializeSplitSelections()
                }
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

    private var splitHint: some View {
        Text(localization.t("player.dualLanguageHint"))
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.xs)
            .padding(.bottom, DesignTokens.Spacing.xs)
    }

    // MARK: - Language List

    private var languageList: some View {
        ForEach(SubtitleLanguages.all, id: \.code) { info in
            if isSplitSelectionMode {
                splitLanguageRow(info: info)
            } else {
                singleLanguageRow(info: info)
            }
        }
    }

    // MARK: - Single Select Row

    private func singleLanguageRow(info: SubtitleLanguageInfo) -> some View {
        Button {
            onSelectLanguage(info.code)
            dismiss()
        } label: {
            languageRowContent(
                info: info,
                isSelected: info.code == selectedLanguage,
                showCheckbox: false
            )
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(info.name)
        .accessibilityValue(info.code == selectedLanguage ? "Selected" : "")
    }

    // MARK: - Split Checkbox Row

    private func splitLanguageRow(info: SubtitleLanguageInfo) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                toggleSplitSelection(info.code)
            }
        } label: {
            languageRowContent(
                info: info,
                isSelected: splitSelections.contains(info.code),
                showCheckbox: true
            )
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(info.name)
        .accessibilityValue(splitSelections.contains(info.code) ? "Checked" : "Unchecked")
    }

    // MARK: - Shared Row Content

    private func languageRowContent(
        info: SubtitleLanguageInfo,
        isSelected: Bool,
        showCheckbox: Bool
    ) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            if showCheckbox {
                Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                    .font(.system(size: 20))
                    .foregroundStyle(
                        isSelected ? DesignTokens.Primary.p400 : DesignTokens.Text.muted
                    )
            }
            Text(info.emojiFlag)
                .font(.system(size: 20))
                .frame(width: 32, height: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(info.nativeName)
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(info.name)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            Spacer()
            if !showCheckbox, isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(rowBackground(isSelected: isSelected))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }

    // MARK: - Confirm Button

    private var confirmButton: some View {
        VStack(spacing: 0) {
            Divider().background(DesignTokens.Glass.border)
            Button {
                confirmSplitSelection()
            } label: {
                Text(localization.t("common.confirm"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.md)
                    .background(confirmButtonBackground)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
            .disabled(splitSelections.count != 2)
            .padding(DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
    }

    private var confirmButtonBackground: some View {
        Group {
            if splitSelections.count == 2 {
                DesignTokens.Primary.p500
            } else {
                DesignTokens.Primary.p800.opacity(0.5)
            }
        }
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

    private func initializeSplitSelections() {
        var initial: Set<String> = [selectedLanguage]
        if let sec = secondaryLanguage {
            initial.insert(sec)
        }
        splitSelections = initial
    }

    private func toggleSplitSelection(_ code: String) {
        if splitSelections.contains(code) {
            splitSelections.remove(code)
        } else if splitSelections.count < 2 {
            splitSelections.insert(code)
        } else {
            // Already 2 selected: replace the one that isn't the first-selected
            let sorted = Array(splitSelections).sorted()
            if let toRemove = sorted.last {
                splitSelections.remove(toRemove)
            }
            splitSelections.insert(code)
        }
    }

    private func confirmSplitSelection() {
        let langs = Array(splitSelections)
        guard langs.count == 2 else { return }
        // The primary language drives the WebSocket target.
        // If one language matches the live source ("he"), make the OTHER the primary
        // so the WebSocket translates to a different language, not source→source.
        let sourceLang = "he"
        if langs[0] == sourceLang, langs[1] != sourceLang {
            onSelectLanguage(langs[1])
            onSelectSecondaryLanguage?(langs[0])
        } else {
            onSelectLanguage(langs[0])
            onSelectSecondaryLanguage?(langs[1])
        }
        dismiss()
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
