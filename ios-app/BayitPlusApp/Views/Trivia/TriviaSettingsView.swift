import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Trivia settings view for configuring display preferences and content categories.
struct TriviaSettingsView: View {
    @State private var autoPlay: Bool = true
    @State private var frequency: TriviaFrequency = .medium
    @State private var selectedCategories: Set<String> = ["cast", "production", "historical", "cultural", "fun"]
    @State private var isSaving = false
    @State private var showResetConfirmation = false

    let repository: any TriviaRepository

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization

    enum TriviaFrequency: String, CaseIterable {
        case off, low, medium, high

        var displayName: String {
            switch self {
            case .off: return "Off"
            case .low: return "Low"
            case .medium: return "Medium"
            case .high: return "High"
            }
        }
    }

    private let availableCategories = [
        ("cast", "Cast & Crew", "person.2.fill"),
        ("production", "Production", "film"),
        ("historical", "Historical", "clock.fill"),
        ("cultural", "Cultural", "globe"),
        ("fun", "Fun Facts", "lightbulb.fill"),
        ("awards", "Awards", "trophy.fill"),
        ("locations", "Locations", "map.fill"),
        ("music", "Music", "music.note")
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.xl) {
                    displaySettingsSection
                    contentPreferencesSection
                    resetButton
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("trivia.settings.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    saveButton
                }
                ToolbarItem(placement: .topBarLeading) {
                    cancelButton
                }
            }
            .confirmationDialog(
                "Reset Settings",
                isPresented: $showResetConfirmation,
                titleVisibility: .visible
            ) {
                Button("Reset to Defaults", role: .destructive) {
                    resetToDefaults()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text(localization.t("trivia.settings.resetConfirm"))
            }
        }
        .task {
            await loadPreferences()
        }
    }

    // MARK: - Display Settings

    private var displaySettingsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            sectionHeader("Display Settings", icon: "gearshape.fill")

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    Toggle(isOn: $autoPlay) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(localization.t("trivia.settings.autoPlay"))
                                .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                                .foregroundStyle(DesignTokens.Text.primary)

                            Text(localization.t("trivia.autoShowDescription"))
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }
                    .toggleStyle(SwitchToggleStyle(tint: DesignTokens.Primary.p400))

                    Divider()
                        .background(DesignTokens.Text.muted.opacity(0.3))

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text(localization.t("trivia.settings.frequency"))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)

                        HStack(spacing: DesignTokens.Spacing.sm) {
                            ForEach(TriviaFrequency.allCases, id: \.self) { freq in
                                GlassChip(
                                    title: freq.displayName,
                                    isSelected: frequency == freq
                                ) {
                                    let generator = UIImpactFeedbackGenerator(style: .light)
                                    generator.impactOccurred()
                                    frequency = freq
                                }
                            }
                        }
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }

    // MARK: - Content Preferences

    private var contentPreferencesSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                sectionHeader("Content Preferences", icon: "list.bullet")
                Spacer()
                Text("\(selectedCategories.count)/\(availableCategories.count) selected")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            HStack(spacing: DesignTokens.Spacing.sm) {
                GlassButton(
                    "Select All",
                    variant: .secondary,
                    size: .small
                ) {
                    selectedCategories = Set(availableCategories.map { $0.0 })
                }

                GlassButton(
                    "Deselect All",
                    variant: .secondary,
                    size: .small
                ) {
                    selectedCategories.removeAll()
                }
            }

            VStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(availableCategories, id: \.0) { category in
                    categoryCard(category)
                }
            }
        }
    }

    private func categoryCard(_ category: (String, String, String)) -> some View {
        let isSelected = selectedCategories.contains(category.0)

        return Button {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()

            if isSelected {
                selectedCategories.remove(category.0)
            } else {
                selectedCategories.insert(category.0)
            }
        } label: {
            GlassCard {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: category.2)
                        .font(.system(size: 20))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .frame(width: 32)

                    Text(category.1)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(DesignTokens.Primary.p400)
                    } else {
                        Image(systemName: "circle")
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(category.1)
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
    }

    // MARK: - Reset Button

    private var resetButton: some View {
        GlassButton(
            "Reset to Defaults",
            variant: .secondary,
            size: .medium,
            icon: Image(systemName: "arrow.counterclockwise")
        ) {
            showResetConfirmation = true
        }
        .accessibilityLabel("Reset all settings to defaults")
    }

    // MARK: - Toolbar Buttons

    private var saveButton: some View {
        Button {
            Task { await savePreferences() }
        } label: {
            if isSaving {
                ProgressView()
                    .tint(DesignTokens.Primary.p400)
            } else {
                Text(localization.t("common.save"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
        }
        .disabled(isSaving)
    }

    private var cancelButton: some View {
        Button {
            dismiss()
        } label: {
            Text(localization.t("common.cancel"))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String, icon: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Actions

    private func loadPreferences() async {
        // In production, load from repository
        // For now, using default values
    }

    private func savePreferences() async {
        isSaving = true

        // In production, save via repository
        try? await Task.sleep(for: .seconds(1))

        isSaving = false
        dismiss()
    }

    private func resetToDefaults() {
        autoPlay = true
        frequency = .medium
        selectedCategories = Set(availableCategories.map { $0.0 })
    }
}
