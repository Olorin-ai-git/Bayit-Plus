import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet for adding an IPTV M3U playlist source on iOS.
struct AddIPTVSourceSheet: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    @State private var urlText = ""
    @State private var nameText = ""
    @State private var isValidating = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(localization.t("byoc.playlistURL"), text: $urlText)
                        .keyboardType(.URL)
                        .textContentType(.URL)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)

                    TextField(localization.t("byoc.playlistName"), text: $nameText)
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
                                Text(localization.t("byoc.addIPTV"))
                            }
                            Spacer()
                        }
                    }
                    .disabled(urlText.isEmpty || isValidating)
                }
            }
            .scrollContentBackground(.hidden)
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("byoc.addIPTV"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                }
            }
        }
    }

    private func addSource() async {
        guard let url = URL(string: urlText) else {
            error = localization.t("byoc.invalidURL")
            return
        }
        isValidating = true
        error = nil

        do {
            let name = nameText.isEmpty ? url.host ?? "IPTV" : nameText
            try await byocManager.addIPTVSource(name: name, url: url)
            dismiss()
        } catch {
            self.error = localization.t("byoc.fetchFailed")
        }

        isValidating = false
    }
}
