#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Highlight Reel Card

    struct TVHighlightReelCard: View {
        let reel: HighlightReelItem
        let isSending: Bool
        let onShare: () -> Void
        let localization: LocalizationManager

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                thumbnailView
                reelDetails
                Spacer()
                if reel.shareToken != nil, reel.status == "completed" {
                    shareButton
                }
            }
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }

        @ViewBuilder
        private var thumbnailView: some View {
            if let thumbnailUrl = reel.thumbnailUrl {
                CachedAsyncImage(url: URL(string: thumbnailUrl)) {
                    DesignTokens.Glass.bgMedium
                }
                .frame(width: 160, height: 160)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            } else {
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(width: 160, height: 160)
                    .overlay {
                        Image(systemName: "video.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
            }
        }

        private var reelDetails: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("zehAni.highlights.momentCount", ["count": "\(reel.momentCount)"]))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Circle()
                        .fill(statusColor(reel.status))
                        .frame(width: 12, height: 12)
                    Text(statusText(reel.status))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(statusColor(reel.status))
                }

                Text(formatDate(reel.createdAt))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        private var shareButton: some View {
            Button {
                onShare()
            } label: {
                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    if isSending {
                        ProgressView().tint(DesignTokens.Primary.default)
                            .frame(width: TVDesignTokens.FontSize.xxl, height: TVDesignTokens.FontSize.xxl)
                    } else {
                        Image(systemName: "paperplane.fill")
                            .font(.system(size: TVDesignTokens.FontSize.xxl))
                    }
                    Text(localization.t("zehAni.highlights.sendToFamily"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                }
                .foregroundStyle(DesignTokens.Primary.default)
                .padding(TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
            .disabled(isSending)
        }

        private func statusText(_ status: String) -> String {
            localization.t("zehAni.highlights.status.\(status)")
        }

        private func statusColor(_ status: String) -> Color {
            switch status {
            case "completed": return DesignTokens.Success.default
            case "processing": return DesignTokens.Warning.default
            case "failed": return DesignTokens.ErrorColor.default
            default: return DesignTokens.Text.secondary
            }
        }

        private func formatDate(_ dateString: String) -> String {
            let formatter = ISO8601DateFormatter()
            guard let date = formatter.date(from: dateString) else { return dateString }
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
    }

    // MARK: - TVHighlightsView Data Actions

    extension TVHighlightsView {
        @MainActor
        func loadReels() async {
            isLoading = true
            error = nil
            do {
                reels = try await repos.zehAniRepository.listHighlightReels(profileId: profileId)
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }

        @MainActor
        func generateReel() async {
            isGenerating = true
            error = nil
            do {
                let newReel = try await repos.zehAniRepository.generateHighlightReel(profileId: profileId)
                reels.insert(newReel, at: 0)
            } catch {
                self.error = error.localizedDescription
            }
            isGenerating = false
        }

        func shareReel(_ reel: HighlightReelItem) {
            let reelId = reel.id
            isSending = true
            Task {
                do {
                    let sentCount = try await repos.zehAniRepository
                        .sendHighlightReelToContacts(reelId: reelId)
                    sentConfirmation = localization.t(
                        "zehAni.highlights.sentToContacts",
                        ["count": "\(sentCount)"]
                    )
                } catch {
                    self.error = error.localizedDescription
                }
                isSending = false
                if sentConfirmation != nil {
                    try? await Task.sleep(for: .seconds(4))
                    sentConfirmation = nil
                }
            }
        }
    }

#endif
