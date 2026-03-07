#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS sheet for adding an Xtream Codes source.
    struct TVAddXtreamSourceSheet: View {
        @Environment(BYOCSourceManager.self) var byocManager
        @Environment(LocalizationManager.self) var localization

        let onDismiss: () -> Void

        @State private var serverURL = ""
        @State private var username = ""
        @State private var password = ""
        @State private var nameText = ""
        @State private var isValidating = false
        @State private var error: String?

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection

                    VStack(spacing: TVDesignTokens.Spacing.lg) {
                        tvTextField(
                            label: localization.t("byoc.xtreamServer"),
                            text: $serverURL,
                            placeholder: "http://provider.com:8080"
                        )
                        tvTextField(
                            label: localization.t("byoc.xtreamUsername"),
                            text: $username,
                            placeholder: localization.t("byoc.xtreamUsername")
                        )
                        tvSecureField(
                            label: localization.t("byoc.xtreamPassword"),
                            text: $password
                        )
                        tvTextField(
                            label: localization.t("byoc.sourceName"),
                            text: $nameText,
                            placeholder: localization.t("byoc.sourceName")
                        )
                    }

                    if let error {
                        Text(error)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(.red)
                    }

                    HStack(spacing: TVDesignTokens.Spacing.xl) {
                        Button {
                            onDismiss()
                        } label: {
                            Text(localization.t("common.cancel"))
                                .frame(width: 200)
                        }

                        Button {
                            Task { await addSource() }
                        } label: {
                            if isValidating {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text(localization.t("byoc.addXtream"))
                                    .frame(width: 200)
                            }
                        }
                        .disabled(!isFormValid || isValidating)
                    }

                    Spacer()
                }
                .padding(TVDesignTokens.Spacing.xxl)
            }
        }

        private var headerSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "tv.and.mediabox")
                    .font(.system(size: 60))
                    .foregroundStyle(.purple)

                Text(localization.t("byoc.addXtream"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("byoc.xtreamConnectDesc"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        private var isFormValid: Bool {
            !serverURL.isEmpty && !username.isEmpty && !password.isEmpty
        }

        private func tvTextField(
            label: String, text: Binding<String>, placeholder: String
        ) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                TextField(placeholder, text: text)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
            }
        }

        private func tvSecureField(
            label: String, text: Binding<String>
        ) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                SecureField(label, text: text)
            }
        }

        private func addSource() async {
            isValidating = true
            error = nil

            do {
                let name = nameText.isEmpty ? "Xtream" : nameText
                try await byocManager.addXtreamSource(
                    name: name,
                    serverURL: serverURL,
                    username: username,
                    password: password
                )
                onDismiss()
            } catch {
                self.error = localization.t("byoc.xtreamAuthFailed")
            }

            isValidating = false
        }
    }

#endif
