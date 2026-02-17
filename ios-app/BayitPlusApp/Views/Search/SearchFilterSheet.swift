import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet presenting advanced search filters: language, subtitles/dubbing,
/// year range, and duration presets. Binds directly to `SearchAdvancedFilters`.
struct SearchFilterSheet: View {
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
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
                    languageSection
                    accessibilitySection
                    yearSection
                    durationSection
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.vertical, DesignTokens.Spacing.md)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("search.filter.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("search.filter.reset")) {
                        draft.reset()
                    }
                    .foregroundStyle(DesignTokens.Text.secondary)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.close")) { onDismiss() }
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .safeAreaInset(edge: .bottom) { applyFooter }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .onAppear { draft = filters }
    }

    // MARK: - Language

    private var languageSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("search.filter.language"))
            FlowLayout(spacing: DesignTokens.Spacing.sm) {
                ForEach(Self.languages, id: \.self) { code in
                    GlassChip(
                        title: localization.t("search.filter.language.\(code)"),
                        isSelected: draft.language == code
                    ) {
                        draft.language = draft.language == code ? nil : code
                    }
                    .accessibilityLabel(localization.t("search.filter.language.\(code)"))
                    .accessibilityAddTraits(draft.language == code ? .isSelected : [])
                }
            }
        }
    }

    // MARK: - Accessibility (Subtitles / Dubbing)

    private var accessibilitySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("search.filter.accessibility"))
            HStack(spacing: DesignTokens.Spacing.sm) {
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
        }
    }

    // MARK: - Year Range

    private var yearSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("search.filter.yearRange"))
            HStack(spacing: DesignTokens.Spacing.md) {
                yearField(
                    placeholder: localization.t("search.filter.yearFrom"),
                    value: Binding(
                        get: { draft.yearFrom.map(String.init) ?? "" },
                        set: { draft.yearFrom = Int($0) }
                    )
                )
                Text("—")
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.muted)
                yearField(
                    placeholder: localization.t("search.filter.yearTo"),
                    value: Binding(
                        get: { draft.yearTo.map(String.init) ?? "" },
                        set: { draft.yearTo = Int($0) }
                    )
                )
            }
        }
    }

    private func yearField(placeholder: String, value: Binding<String>) -> some View {
        TextField(placeholder, text: value)
            .keyboardType(.numberPad)
            .textFieldStyle(.plain)
            .font(.system(size: DesignTokens.FontSize.md))
            .foregroundStyle(DesignTokens.Text.primary)
            .multilineTextAlignment(.center)
            .padding(DesignTokens.Spacing.sm)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }

    // MARK: - Duration

    private var durationSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("search.filter.duration"))
            FlowLayout(spacing: DesignTokens.Spacing.sm) {
                ForEach(Self.durations, id: \.labelKey) { preset in
                    GlassChip(
                        title: localization.t(preset.labelKey),
                        isSelected: draft.durationMin == preset.min && draft.durationMax == preset.max
                    ) {
                        let alreadySelected =
                            draft.durationMin == preset.min && draft.durationMax == preset.max
                        if alreadySelected {
                            draft.durationMin = nil
                            draft.durationMax = nil
                        } else {
                            draft.durationMin = preset.min
                            draft.durationMax = preset.max
                        }
                    }
                }
            }
        }
    }

    // MARK: - Footer

    private var applyFooter: some View {
        VStack(spacing: 0) {
            Divider().background(DesignTokens.Glass.bg)
            GlassButton(
                applyLabel,
                variant: .primary
            ) {
                filters = draft
                onApply()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
        .background(DesignTokens.Background.primary)
    }

    private var applyLabel: String {
        let count = draft.activeCount
        guard count > 0 else { return localization.t("search.filter.apply") }
        return localization.t("search.filter.applyCount", ["count": String(count)])
    }

    // MARK: - Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }
}
