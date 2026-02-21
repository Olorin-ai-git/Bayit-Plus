#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Language list rows and selection logic extracted from GlassAILanguagePickerView.
    extension GlassAILanguagePickerView {
        // MARK: - Language List

        var languageList: some View {
            ForEach(SubtitleLanguages.all, id: \.code) { info in
                if isSplitSelectionMode {
                    splitLanguageRow(info: info)
                } else {
                    singleLanguageRow(info: info)
                }
            }
        }

        // MARK: - Single Select Row

        func singleLanguageRow(info: SubtitleLanguageInfo) -> some View {
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

        func splitLanguageRow(info: SubtitleLanguageInfo) -> some View {
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
    }
#endif
