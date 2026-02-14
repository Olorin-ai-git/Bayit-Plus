import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet view for creating a new user profile.
///
/// Presents a form with name, avatar color selection, and kids profile toggle.
/// Calls `AuthManager.createProfile()` to persist the profile via the backend.
struct AddProfileSheetView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    @State private var profileName = ""
    @State private var selectedColorIndex = 0
    @State private var isKidsProfile = false
    @State private var isCreating = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Colors.Background.primary
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: DesignTokens.Spacing.xl) {
                        avatarPreview
                        nameField
                        colorPicker
                        kidsToggle
                        errorLabel
                    }
                    .padding(DesignTokens.Spacing.xl)
                }
            }
            .navigationTitle("Add Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { createProfile() }
                        .foregroundStyle(
                            canCreate
                                ? DesignTokens.Primary.default
                                : DesignTokens.Text.muted
                        )
                        .disabled(!canCreate || isCreating)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Avatar Preview

    private var avatarPreview: some View {
        ZStack {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(avatarColors[selectedColorIndex])
                .frame(width: 100, height: 100)

            if profileName.isEmpty {
                Image(systemName: "person.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(.white.opacity(0.6))
            } else {
                Text(initials)
                    .font(.system(size: 36, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
    }

    // MARK: - Name Field

    private var nameField: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(localization.t("profiles.profileName"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            TextField(localization.t("profiles.enterName"), text: $profileName)
                .textFieldStyle(.plain)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(DesignTokens.Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .fill(Color.white.opacity(0.08))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
        }
    }

    // MARK: - Color Picker

    private var colorPicker: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("profiles.avatarColor"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(avatarColors.indices, id: \.self) { index in
                    Button {
                        selectedColorIndex = index
                    } label: {
                        Circle()
                            .fill(avatarColors[index])
                            .frame(width: 40, height: 40)
                            .overlay(
                                Circle()
                                    .stroke(
                                        Color.white,
                                        lineWidth: selectedColorIndex == index ? 3 : 0
                                    )
                            )
                            .scaleEffect(selectedColorIndex == index ? 1.15 : 1.0)
                            .animation(
                                .spring(response: 0.3, dampingFraction: 0.7),
                                value: selectedColorIndex
                            )
                    }
                }
            }
        }
    }

    // MARK: - Kids Toggle

    private var kidsToggle: some View {
        HStack {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(localization.t("profiles.kidsProfile"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("profiles.kidsProfileHint"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()

            Toggle("", isOn: $isKidsProfile)
                .labelsHidden()
                .tint(DesignTokens.Primary.default)
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .fill(Color.white.opacity(0.05))
        )
    }

    // MARK: - Error Label

    @ViewBuilder
    private var errorLabel: some View {
        if let errorMessage {
            Text(errorMessage)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Helpers

    private var canCreate: Bool {
        !profileName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private var initials: String {
        profileName
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    private func createProfile() {
        guard canCreate else { return }

        isCreating = true
        errorMessage = nil

        Task {
            do {
                try await authManager.createProfile(
                    name: profileName.trimmingCharacters(in: .whitespaces),
                    avatarColor: avatarColorHexStrings[selectedColorIndex],
                    isKidsProfile: isKidsProfile
                )
                dismiss()
            } catch let authError as AuthError {
                errorMessage = authError.userFacingMessage
            } catch {
                errorMessage = error.localizedDescription
            }
            isCreating = false
        }
    }
}

// MARK: - Color Data

private let avatarColors: [Color] = [
    DesignTokens.Primary.p500,
    DesignTokens.ErrorColor.e400,
    DesignTokens.Success.s400,
    DesignTokens.Warning.w400,
    DesignTokens.Secondary.s500,
    Color(hex: 0x00D9FF),
]

/// Hex strings matching `avatarColors` for the backend API.
private let avatarColorHexStrings: [String] = [
    "#A855F7",
    "#F87171",
    "#4ADE80",
    "#FBBF24",
    "#D946EF",
    "#00D9FF",
]
