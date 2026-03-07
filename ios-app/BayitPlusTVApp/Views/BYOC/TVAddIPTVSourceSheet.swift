#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Sheet for adding an IPTV M3U playlist URL.
    struct TVAddIPTVSourceSheet: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(LocalizationManager.self) private var localization

        let onDismiss: () -> Void

        @State private var playlistName = ""
        @State private var playlistURL = ""
        @State private var isLoading = false
        @State private var errorMessage: String?
        @State private var channelsFound = 0
        @State private var didSucceed = false
        @FocusState private var focusedField: Field?

        private enum Field { case name, url }

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection
                    if didSucceed {
                        successView
                    } else {
                        formSection
                        if let error = errorMessage {
                            errorBanner(error)
                        }
                        actionButtons
                    }
                }
                .padding(TVDesignTokens.Spacing.xxxxl)
            }
        }

        private var headerSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.system(size: 60))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(localization.t("byoc.addIPTV"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("byoc.enterURL"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        private var formSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                tvTextField(
                    label: localization.t("byoc.playlistName"),
                    text: $playlistName,
                    placeholder: "My IPTV"
                )
                .focused($focusedField, equals: .name)

                tvTextField(
                    label: localization.t("byoc.playlistURL"),
                    text: $playlistURL,
                    placeholder: "https://example.com/playlist.m3u"
                )
                .focused($focusedField, equals: .url)
            }
            .frame(maxWidth: 800)
            .onAppear { focusedField = .name }
        }

        private func tvTextField(
            label: String,
            text: Binding<String>,
            placeholder: String
        ) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                TextField(placeholder, text: text)
                    .textFieldStyle(.plain)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .padding(TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Background.elevated)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
        }

        private func errorBanner(_ message: String) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
            }
            .padding(TVDesignTokens.Spacing.md)
            .frame(maxWidth: 800)
            .background(DesignTokens.ErrorColor.default.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }

        private var actionButtons: some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Button { onDismiss() } label: {
                    Text(localization.t("common.cancel"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .padding(TVDesignTokens.Spacing.lg)
                        .frame(width: 200)
                        .background(DesignTokens.Glass.bgMedium)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .tvCardStyle()

                Button { Task { await addSource() } } label: {
                    Group {
                        if isLoading {
                            ProgressView().scaleEffect(0.8)
                        } else {
                            Text(localization.t("byoc.addIPTV"))
                        }
                    }
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .frame(width: 300)
                    .background(DesignTokens.Primary.p400)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .tvCardStyle()
                .disabled(isLoading || playlistURL.isEmpty)
            }
        }

        private var successView: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(DesignTokens.Success.default)

                Text(localization.t("byoc.sourceAdded"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(String(format: localization.t("byoc.channelCount"), channelsFound))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Button { onDismiss() } label: {
                    Text(localization.t("common.close"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(TVDesignTokens.Spacing.lg)
                        .frame(width: 200)
                        .background(DesignTokens.Primary.p400)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .tvCardStyle()
            }
        }

        private func addSource() async {
            errorMessage = nil
            let name = playlistName.isEmpty ? "IPTV" : playlistName
            guard let url = URL(string: playlistURL.trimmingCharacters(in: .whitespacesAndNewlines)) else {
                errorMessage = localization.t("byoc.invalidURL")
                return
            }
            isLoading = true
            do {
                try await byocManager.addIPTVSource(name: name, url: url)
                channelsFound = byocManager.iptvChannels.count
                didSucceed = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

#endif
