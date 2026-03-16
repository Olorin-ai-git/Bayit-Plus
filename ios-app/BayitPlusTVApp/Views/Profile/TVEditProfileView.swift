import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Edit profile screen for tvOS - allows changing display name.
struct TVEditProfileView: View {
    @Environment(LocalizationManager.self) private var localization

    let profile: ProfileResponse
    let viewModel: ProfileViewModel
    let onDismiss: () -> Void

    @State private var displayName: String
    @State private var isSaving = false
    @FocusState private var nameFieldFocused: Bool

    init(profile: ProfileResponse, viewModel: ProfileViewModel, onDismiss: @escaping () -> Void) {
        self.profile = profile
        self.viewModel = viewModel
        self.onDismiss = onDismiss
        _displayName = State(initialValue: profile.displayName ?? "")
    }

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            // Header
            Text(localization.t("profiles.edit"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            // Avatar preview
            avatarPreview

            // Display name field
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("profiles.displayName"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)

                TextField(localization.t("profiles.enterName"), text: $displayName)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(DesignTokens.Glass.bgMedium)
                    .cornerRadius(TVDesignTokens.Radius.md)
                    .focused($nameFieldFocused)
                    .frame(maxWidth: 600)
            }

            // Actions
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Button {
                    onDismiss()
                } label: {
                    Text(localization.t("common.cancel"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(width: 220, height: 70)
                }
                .buttonStyle(.plain)
                .background(DesignTokens.Glass.bgLight)
                .cornerRadius(TVDesignTokens.Radius.md)

                Button {
                    Task { await save() }
                } label: {
                    if isSaving {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text(localization.t("common.saveChanges"))
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .frame(width: 220, height: 70)
                .buttonStyle(.plain)
                .background(
                    LinearGradient(
                        colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(TVDesignTokens.Radius.md)
                .disabled(isSaving || displayName.trimmingCharacters(in: .whitespaces).isEmpty)
                .opacity(displayName.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1.0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task {
            nameFieldFocused = true
        }
    }

    private var avatarPreview: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            if let firstChar = displayName.first {
                Text(String(firstChar).uppercased())
                    .font(.system(size: 72, weight: .bold))
                    .foregroundStyle(.white)
            } else {
                Image(systemName: "person.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: 160, height: 160)
        .shadow(color: DesignTokens.Glass.purpleGlow.opacity(0.4), radius: 16, x: 0, y: 8)
    }

    private func save() async {
        let trimmedName = displayName.trimmingCharacters(in: .whitespaces)
        guard !trimmedName.isEmpty else { return }

        isSaving = true
        await viewModel.updateDisplayName(trimmedName)
        isSaving = false

        if viewModel.error == nil {
            onDismiss()
        }
    }
}
