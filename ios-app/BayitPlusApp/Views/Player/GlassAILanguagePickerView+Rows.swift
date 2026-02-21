#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Row Content & Helpers

    extension GlassAILanguagePickerView {
        func languageRowContent(
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

        var confirmButton: some View {
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

        var confirmButtonBackground: some View {
            Group {
                if splitSelections.count == 2 {
                    DesignTokens.Primary.p500
                } else {
                    DesignTokens.Primary.p800.opacity(0.5)
                }
            }
        }

        var dismissButton: some View {
            Button { dismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel(localization.t("common.close"))
        }

        // MARK: - Helpers

        func initializeSplitSelections() {
            var initial: Set<String> = [selectedLanguage]
            if let sec = secondaryLanguage {
                initial.insert(sec)
            }
            splitSelections = initial
        }

        func toggleSplitSelection(_ code: String) {
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

        func confirmSplitSelection() {
            let langs = Array(splitSelections)
            guard langs.count == 2 else { return }
            // The primary language drives the WebSocket target.
            // If one language matches the live source ("he"), make the OTHER the primary
            // so the WebSocket translates to a different language, not source->source.
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

        func rowBackground(isSelected: Bool) -> some View {
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
