#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVAvatarStylePickerView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @Environment(\.dismiss) private var dismiss

        let profileId: String
        let onCreated: () -> Void

        @State private var selectedStyle: AvatarStyle = .cartoon2d
        @State private var childName = ""
        @State private var pin = ""
        @State private var isCreating = false
        @State private var error: String?
        @FocusState private var focusedField: Field?

        private enum Field: Hashable {
            case name, pin, create, cancel
        }

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xxl) {
                    Text(localization.t("zehAni.avatarCreation.newAvatar"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.xxl, weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                    stylePicker

                    VStack(spacing: TVDesignTokens.Spacing.lg) {
                        nameField
                        pinField
                    }

                    if let error {
                        Text(error)
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .multilineTextAlignment(.center)
                    }

                    actionButtons

                    if isCreating {
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            ProgressView().tint(.white)
                            Text(localization.t("common.loading"))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }
                }
                .frame(maxWidth: 700)
                .padding(TVDesignTokens.Spacing.xxl)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
            }
            .onAppear { focusedField = .name }
        }

        private var stylePicker: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                ForEach(AvatarStyle.allCases, id: \.rawValue) { style in
                    Button {
                        selectedStyle = style
                    } label: {
                        VStack(spacing: TVDesignTokens.Spacing.sm) {
                            Image(systemName: styleIcon(style))
                                .font(.system(size: 36))
                                .foregroundStyle(
                                    selectedStyle == style
                                        ? DesignTokens.Primary.p400
                                        : DesignTokens.Text.muted
                                )

                            Text(style.displayName)
                                .font(.system(
                                    size: TVDesignTokens.FontSize.base,
                                    weight: selectedStyle == style
                                        ? .bold : .regular
                                ))
                                .foregroundStyle(DesignTokens.Text.primary)
                        }
                        .padding(TVDesignTokens.Spacing.md)
                    }
                    .tvCardStyle()
                }
            }
        }

        private var nameField: some View {
            TextField(
                localization.t("zehAni.avatarCreation.childName"),
                text: $childName
            )
            .textFieldStyle(.plain)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundStyle(.white)
            .padding(TVDesignTokens.Spacing.lg)
            .background(Color.white.opacity(0.08))
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(
                        focusedField == .name
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Glass.border,
                        lineWidth: focusedField == .name ? 2 : 1
                    )
            )
            .focused($focusedField, equals: .name)
            .frame(maxWidth: 500)
        }

        private var pinField: some View {
            SecureField(
                localization.t("zehAni.avatarCreation.familyPin"),
                text: $pin
            )
            .textFieldStyle(.plain)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundStyle(.white)
            .padding(TVDesignTokens.Spacing.lg)
            .background(Color.white.opacity(0.08))
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(
                        focusedField == .pin
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Glass.border,
                        lineWidth: focusedField == .pin ? 2 : 1
                    )
            )
            .focused($focusedField, equals: .pin)
            .frame(maxWidth: 500)
        }

        private var actionButtons: some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Button {
                    dismiss()
                } label: {
                    Text(localization.t("common.cancel"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                }
                .tvCardStyle()
                .focused($focusedField, equals: .cancel)

                Button {
                    createAvatar()
                } label: {
                    Text(localization.t("zehAni.avatarCreation.create"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                }
                .tvCardStyle()
                .focused($focusedField, equals: .create)
                .disabled(childName.isEmpty || pin.count < 4 || isCreating)
                .opacity(
                    childName.isEmpty || pin.count < 4 ? 0.4 : 1
                )
            }
        }

        private func styleIcon(_ style: AvatarStyle) -> String {
            switch style {
            case .cartoon2d: return "paintbrush.pointed"
            case .pixar3d: return "cube"
            case .disney3d: return "sparkles"
            case .anime3d: return "star"
            }
        }

        private func createAvatar() {
            isCreating = true
            error = nil
            Task {
                do {
                    _ = try await repos.starStory.createAvatar(
                        profileId: profileId,
                        name: childName,
                        style: selectedStyle.rawValue,
                        pin: pin
                    )
                    await MainActor.run {
                        onCreated()
                        dismiss()
                    }
                } catch {
                    await MainActor.run {
                        self.error = error.localizedDescription
                        isCreating = false
                    }
                }
            }
        }
    }
#endif
