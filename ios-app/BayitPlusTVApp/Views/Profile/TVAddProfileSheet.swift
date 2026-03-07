import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Modal sheet for adding a new household member profile.
/// Presents a name input and gradient avatar selection.
struct TVAddProfileSheet: View {
    @Environment(LocalizationManager.self) private var localization

    let viewModel: TVProfileSelectionViewModel
    let onDismiss: () -> Void

    @State private var profileName = ""
    @State private var selectedGradient: String?
    @FocusState private var isNameFocused: Bool

    private let gradientOptions: [(id: String, colors: [Color])] = [
        ("purple-pink", [.purple, .pink]),
        ("blue-cyan", [.blue, .cyan]),
        ("green-teal", [.green, .teal]),
        ("orange-red", [.orange, .red]),
        ("indigo-purple", [.indigo, .purple]),
        ("yellow-orange", [.yellow, .orange]),
    ]

    var body: some View {
        ZStack {
            DesignTokens.Colors.Background.primary.ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.xxxl) {
                header
                nameInput
                avatarGrid
                actionButtons
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .onExitCommand { onDismiss() }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("profile.addProfile"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("profile.addProfileSubtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Name Input

    private var nameInput: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("profile.name"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)
                .kerning(2.0)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "person.fill")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)

                TextField("", text: $profileName)
                    .textFieldStyle(.plain)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .tint(DesignTokens.Colors.Primary.light)
                    .focused($isNameFocused)
                    .autocorrectionDisabled()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(
                        isNameFocused
                            ? DesignTokens.Glass.bgMedium
                            : DesignTokens.Glass.bgLight
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(
                        isNameFocused
                            ? DesignTokens.Colors.Primary.base
                            : DesignTokens.Glass.border,
                        lineWidth: isNameFocused ? 2 : 1
                    )
            )
        }
        .frame(maxWidth: TVDesignTokens.Form.maxWidth)
    }

    // MARK: - Avatar Grid

    private var avatarGrid: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("profile.chooseAvatar"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)
                .kerning(2.0)

            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(gradientOptions, id: \.id) { option in
                    Button {
                        selectedGradient = option.id
                    } label: {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: option.colors,
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 100, height: 100)
                            .overlay(
                                Circle().strokeBorder(
                                    selectedGradient == option.id
                                        ? DesignTokens.Glass.borderFocus
                                        : Color.clear,
                                    lineWidth: TVDesignTokens.Focus.ringWidth
                                )
                            )
                    }
                    .tvCardStyle()
                }
            }
        }
    }

    // MARK: - Actions

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassButton(
                localization.t("common.cancel"),
                variant: .secondary,
                size: .medium
            ) {
                onDismiss()
            }

            GlassButton(
                viewModel.isSaving
                    ? localization.t("common.saving")
                    : localization.t("common.save"),
                variant: .primary,
                size: .medium,
                isDisabled: profileName.trimmingCharacters(in: .whitespaces).isEmpty,
                isLoading: viewModel.isSaving
            ) {
                Task {
                    let success = await viewModel.addProfile(
                        name: profileName.trimmingCharacters(in: .whitespaces),
                        avatarId: selectedGradient
                    )
                    if success { onDismiss() }
                }
            }
        }
    }
}
