#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Add Contact Sheet

    struct TVContactAddSheet: View {
        @Environment(LocalizationManager.self) private var localization

        @Binding var displayName: String
        @Binding var phoneNumber: String
        @Binding var relationship: String
        @Binding var language: String
        @Binding var pin: String

        let isSaving: Bool
        let error: String?
        let relationships: [String]
        let languages: [String]
        let onCancel: () -> Void
        let onSave: () -> Void

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    Text(localization.t("zehAni.contacts.add"))
                        .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    VStack(spacing: TVDesignTokens.Spacing.lg) {
                        TextField(localization.t("zehAni.contacts.name"), text: $displayName)
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .padding(TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Glass.bgMedium)
                            .cornerRadius(TVDesignTokens.Radius.md)

                        TextField(localization.t("zehAni.contacts.phone"), text: $phoneNumber)
                            .keyboardType(.phonePad)
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .padding(TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Glass.bgMedium)
                            .cornerRadius(TVDesignTokens.Radius.md)

                        Menu {
                            ForEach(relationships, id: \.self) { rel in
                                Button(rel.capitalized) {
                                    relationship = rel
                                }
                            }
                        } label: {
                            HStack {
                                Text(relationship.capitalized)
                                    .font(.system(size: TVDesignTokens.FontSize.lg))
                                Spacer()
                                Image(systemName: "chevron.down")
                            }
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Glass.bgMedium)
                            .cornerRadius(TVDesignTokens.Radius.md)
                        }

                        Menu {
                            ForEach(languages, id: \.self) { lang in
                                Button(lang.uppercased()) {
                                    language = lang
                                }
                            }
                        } label: {
                            HStack {
                                Text(language.uppercased())
                                    .font(.system(size: TVDesignTokens.FontSize.lg))
                                Spacer()
                                Image(systemName: "chevron.down")
                            }
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Glass.bgMedium)
                            .cornerRadius(TVDesignTokens.Radius.md)
                        }

                        SecureField(localization.t("zehAni.contacts.pin"), text: $pin)
                            .keyboardType(.numberPad)
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .padding(TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Glass.bgMedium)
                            .cornerRadius(TVDesignTokens.Radius.md)
                    }

                    if let error = error {
                        Text(error)
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                    }

                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        Button {
                            onCancel()
                        } label: {
                            Text(localization.t("common.cancel"))
                                .frame(maxWidth: .infinity)
                                .padding(TVDesignTokens.Spacing.lg)
                        }
                        .buttonStyle(.card)

                        Button {
                            onSave()
                        } label: {
                            Text(localization.t("common.save"))
                                .frame(maxWidth: .infinity)
                                .padding(TVDesignTokens.Spacing.lg)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(isSaving || displayName.isEmpty || phoneNumber.isEmpty || pin.isEmpty)
                    }
                }
                .padding(TVDesignTokens.Spacing.xxxl)
            }
        }
    }

#endif
