#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Full language picker sheet for selecting the unified AI target language.
    ///
    /// Shows a single list of languages with flags and names.
    /// A "Split Screen" toggle reveals checkboxes for multi-select (exactly 2 languages)
    /// with a sticky "Confirm" button at the bottom.
    ///
    /// Language list rows and selection logic are in `AILanguagePickerList.swift`.
    struct GlassAILanguagePickerView: View {
        let selectedLanguage: String
        let secondaryLanguage: String?
        let onSelectLanguage: (String) -> Void
        let onSelectSecondaryLanguage: ((String) -> Void)?

        @Environment(\.dismiss) var dismiss
        @Environment(LocalizationManager.self) var localization
        @State var isSplitSelectionMode = false
        @State var splitSelections: Set<String> = []

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

        // confirmButton, confirmButtonBackground, dismissButton are defined in GlassAILanguagePickerView+Rows.swift
    }
#endif
