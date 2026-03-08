import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Track Changes, Save & UI Helpers

extension TVPreferencesView {
    func trackChanges() {
        showSaved = false
        hasChanges = selectedLanguage != (preferences?.language ?? "en")
            || selectedSubtitleLanguage != (preferences?.subtitleLanguage ?? "he")
            || autoplay != (preferences?.autoplay ?? true)
            || notifications != (preferences?.notifications ?? true)
            || contentRating != (preferences?.contentRating ?? "pg13")
            || quality != (preferences?.quality ?? "auto")
    }

    func save() async {
        isSaving = true

        let update = ProfilePreferencesUpdate(
            language: selectedLanguage,
            subtitleLanguage: selectedSubtitleLanguage,
            autoplay: autoplay,
            notifications: notifications,
            contentRating: contentRating,
            quality: quality
        )

        await viewModel.updatePreferences(update)
        isSaving = false

        if viewModel.error == nil {
            hasChanges = false
            showSaved = true

            if let language = Language(rawValue: selectedLanguage) {
                localization.setLanguage(language)
            }
        }
    }

    // MARK: - Row Components

    func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(.leading, TVDesignTokens.Spacing.sm)
    }

    func toggleRow(
        icon: String,
        title: String,
        subtitle: String,
        isOn: Binding<Bool>,
        color: Color
    ) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 28))
                .foregroundStyle(color)
                .frame(width: 44)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(subtitle)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            Spacer()

            Toggle("", isOn: isOn)
                .labelsHidden()
                .tint(DesignTokens.Primary.p400)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    func pickerRow(
        icon: String,
        title: String,
        selection: Binding<String>,
        options: [(String, String)]
    ) -> some View {
        Button {
            cycleSelection(selection, options: options)
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 44)

                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Text(displayName(for: selection.wrappedValue, in: options))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Image(systemName: "chevron.right")
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
    }

    private func displayName(for value: String, in options: [(String, String)]) -> String {
        options.first(where: { $0.0 == value })?.1 ?? value
    }

    private func cycleSelection(_ selection: Binding<String>, options: [(String, String)]) {
        guard let currentIndex = options.firstIndex(where: { $0.0 == selection.wrappedValue }) else {
            if let first = options.first { selection.wrappedValue = first.0 }
            return
        }
        let nextIndex = (currentIndex + 1) % options.count
        selection.wrappedValue = options[nextIndex].0
    }
}
