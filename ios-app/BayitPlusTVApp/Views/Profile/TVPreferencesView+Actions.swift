import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Actions & UI Helpers

extension TVPreferencesView {
    func applyLanguage() {
        if let language = Language(rawValue: selectedLanguage) {
            localization.setLanguage(language)
        }
        persistPreferences()
    }

    func persistPreferences() {
        let update = ProfilePreferencesUpdate(
            language: selectedLanguage,
            subtitleLanguage: selectedSubtitleLanguage,
            autoplay: autoplay,
            notifications: notifications,
            contentRating: contentRating,
            quality: quality
        )
        Task { await viewModel.updatePreferences(update) }
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
        Button {
            isOn.wrappedValue.toggle()
        } label: {
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

                Text(isOn.wrappedValue
                    ? localization.t("common.on")
                    : localization.t("common.off"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(isOn.wrappedValue
                        ? DesignTokens.Primary.p400
                        : DesignTokens.Text.muted)
                    .frame(width: 60, alignment: .trailing)

                Circle()
                    .fill(isOn.wrappedValue
                        ? DesignTokens.Primary.p400
                        : DesignTokens.Text.muted.opacity(0.3))
                    .frame(width: 20, height: 20)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(TVInlineButtonStyle())
    }

    func pickerRow(
        icon: String,
        title: String,
        selection: Binding<String>,
        options: [(String, String)]
    ) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 44)

                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.top, TVDesignTokens.Spacing.lg)
            .padding(.bottom, TVDesignTokens.Spacing.sm)

            ForEach(options, id: \.0) { value, label in
                Button {
                    selection.wrappedValue = value
                } label: {
                    HStack {
                        Text(label)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(selection.wrappedValue == value
                                ? DesignTokens.Primary.p400
                                : DesignTokens.Text.secondary)

                        Spacer()

                        if selection.wrappedValue == value {
                            Image(systemName: "checkmark")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(DesignTokens.Primary.p400)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
                }
                .buttonStyle(TVInlineButtonStyle())
            }

            Spacer().frame(height: TVDesignTokens.Spacing.sm)
        }
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }
}

// MARK: - Inline Button Style (no scale/lift on focus)

private struct TVInlineButtonStyle: ButtonStyle {
    @Environment(\.isFocused) var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(
                isFocused
                    ? DesignTokens.Glass.bgMedium
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            .opacity(configuration.isPressed ? 0.8 : 1.0)
    }
}
