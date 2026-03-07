import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet for adding an Xtream Codes source on iOS.
struct AddXtreamSourceSheet: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let prefilledServerURL: String?

    @State private var serverURL = ""
    @State private var username = ""
    @State private var password = ""
    @State private var nameText = ""
    @State private var isValidating = false
    @State private var error: String?

    init(prefilledServerURL: String? = nil) {
        self.prefilledServerURL = prefilledServerURL
        _serverURL = State(initialValue: prefilledServerURL ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(
                        localization.t("byoc.xtreamServer"),
                        text: $serverURL
                    )
                    .keyboardType(.URL)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)

                    TextField(
                        localization.t("byoc.xtreamUsername"),
                        text: $username
                    )
                    .autocapitalization(.none)
                    .disableAutocorrection(true)

                    SecureField(
                        localization.t("byoc.xtreamPassword"),
                        text: $password
                    )
                }

                Section {
                    TextField(
                        localization.t("byoc.sourceName"),
                        text: $nameText
                    )
                }

                if let error {
                    Section {
                        Text(error)
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                            .font(.system(size: DesignTokens.FontSize.sm))
                    }
                }

                Section {
                    Button {
                        Task { await addSource() }
                    } label: {
                        HStack {
                            Spacer()
                            if isValidating {
                                ProgressView()
                                    .tint(.white)
                                    .padding(.trailing, DesignTokens.Spacing.sm)
                                Text(localization.t("byoc.validating"))
                            } else {
                                Text(localization.t("byoc.addXtream"))
                            }
                            Spacer()
                        }
                    }
                    .disabled(!isFormValid || isValidating)
                }
            }
            .scrollContentBackground(.hidden)
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("byoc.addXtream"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                }
            }
        }
    }

    private var isFormValid: Bool {
        !serverURL.isEmpty && !username.isEmpty && !password.isEmpty
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
            dismiss()
        } catch {
            self.error = localization.t("byoc.xtreamAuthFailed")
        }

        isValidating = false
    }
}
