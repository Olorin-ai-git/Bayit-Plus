import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// fullScreenCover for advanced search filters on tvOS.
/// Draft pattern: copies filters on appear, commits on apply.
struct TVSearchAdvancedFiltersView: View {
    @Environment(LocalizationManager.self) private var localization
    @Binding var filters: SearchAdvancedFilters
    let onApply: () -> Void
    let onDismiss: () -> Void

    @State private var draft: SearchAdvancedFilters = .init()

    private static let languages = ["he", "en", "ar", "ru", "fr", "es"]

    private static let durations: [(labelKey: String, min: Int?, max: Int?)] = [
        ("search.filter.duration.under30", nil, 30),
        ("search.filter.duration.30to60", 30, 60),
        ("search.filter.duration.1to2hr", 60, 120),
        ("search.filter.duration.over2hr", 120, nil),
    ]

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(localization.t("search.filter.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                    languageSection
                    accessibilitySection
                    yearSection
                    durationSection
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
            footerButtons
        }
        .padding(.vertical, TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .onAppear { draft = filters }
    }

    // MARK: - Language

    private var languageSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionLabel(localization.t("search.filter.language"))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(Self.languages, id: \.self) { code in
                        GlassChip(
                            title: localization.t("search.filter.language.\(code)"),
                            isSelected: draft.language == code
                        ) {
                            draft.language = draft.language == code ? nil : code
                        }
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
            .focusSection()
        }
    }

    // MARK: - Accessibility

    private var accessibilitySection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionLabel(localization.t("search.filter.accessibility"))
            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                GlassChip(
                    title: localization.t("search.filter.subtitles"),
                    isSelected: draft.hasSubtitles == true
                ) {
                    draft.hasSubtitles = draft.hasSubtitles == true ? nil : true
                }
                GlassChip(
                    title: localization.t("search.filter.dubbing"),
                    isSelected: draft.hasDubbing == true
                ) {
                    draft.hasDubbing = draft.hasDubbing == true ? nil : true
                }
            }
            .focusSection()
        }
    }

    // MARK: - Year Range

    private var yearSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionLabel(localization.t("search.filter.yearRange"))
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                yearField(
                    placeholder: localization.t("search.filter.yearFrom"),
                    value: Binding(
                        get: { draft.yearFrom.map(String.init) ?? "" },
                        set: { draft.yearFrom = Int($0) }
                    )
                )
                Text("\u{2014}")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
                yearField(
                    placeholder: localization.t("search.filter.yearTo"),
                    value: Binding(
                        get: { draft.yearTo.map(String.init) ?? "" },
                        set: { draft.yearTo = Int($0) }
                    )
                )
            }
            .focusSection()
        }
    }

    private func yearField(placeholder: String, value: Binding<String>) -> some View {
        TextField(placeholder, text: value)
            .textFieldStyle(.plain)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundStyle(DesignTokens.Text.primary)
            .multilineTextAlignment(.center)
            .padding(TVDesignTokens.Spacing.md)
            .frame(maxWidth: 200)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Spacing.md))
    }

    // MARK: - Duration

    private var durationSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionLabel(localization.t("search.filter.duration"))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(Self.durations, id: \.labelKey) { preset in
                        GlassChip(
                            title: localization.t(preset.labelKey),
                            isSelected: draft.durationMin == preset.min && draft.durationMax == preset.max
                        ) {
                            let selected = draft.durationMin == preset.min && draft.durationMax == preset.max
                            if selected {
                                draft.durationMin = nil
                                draft.durationMax = nil
                            } else {
                                draft.durationMin = preset.min
                                draft.durationMax = preset.max
                            }
                        }
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
            .focusSection()
        }
    }

    // MARK: - Footer

    private var footerButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            GlassButton(localization.t("search.filter.reset"), variant: .ghost, size: .medium) {
                draft.reset()
            }
            .tvCardStyle()

            GlassButton(applyLabel, variant: .primary, size: .medium) {
                filters = draft
                onApply()
            }
            .tvCardStyle()

            GlassButton(localization.t("common.close"), variant: .secondary, size: .medium) {
                onDismiss()
            }
            .tvCardStyle()
        }
        .focusSection()
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    private var applyLabel: String {
        let count = draft.activeCount
        guard count > 0 else { return localization.t("search.filter.apply") }
        return localization.t("search.filter.applyCount", ["count": String(count)])
    }

    // MARK: - Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }
}
