import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct HighlightReelView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var reels: [HighlightReelItem] = []
    @State private var isLoading = false
    @State private var isGenerating = false
    @State private var error: String?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 0) {
                ZehAniBreadcrumb(currentLabel: "Highlights")

                HStack {
                    Text(localization.t("zehAni.highlights.title"))
                        .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)
                    Spacer()
                    Button {
                        Task { await generateReel() }
                    } label: {
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            Image(systemName: "plus.circle.fill")
                            Text(localization.t("zehAni.highlights.generate"))
                        }
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    }
                    .disabled(isGenerating)
                    .opacity(isGenerating ? 0.5 : 1.0)
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.top, DesignTokens.Spacing.lg)

                if isLoading {
                    ProgressView().tint(DesignTokens.Primary.default).frame(maxHeight: .infinity)
                } else if reels.isEmpty {
                    VStack(spacing: DesignTokens.Spacing.lg) {
                        Image(systemName: "film.stack").font(.system(size: DesignTokens.FontSize.hero))
                            .foregroundColor(DesignTokens.Text.muted)
                        Text(localization.t("zehAni.highlights.empty")).foregroundColor(DesignTokens.Text.secondary)
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: DesignTokens.Spacing.md) {
                            ForEach(reels) { reel in
                                reelCard(reel)
                            }
                        }
                        .padding(.horizontal, DesignTokens.Spacing.base)
                        .padding(.vertical, DesignTokens.Spacing.lg)
                    }
                }
            }
        }
        .task { await loadReels() }
    }

    private func reelCard(_ reel: HighlightReelItem) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            if let thumbnailUrl = reel.thumbnailUrl {
                AsyncImage(url: URL(string: thumbnailUrl)) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.white.opacity(0.1)
                }
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            } else {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(width: 80, height: 80)
                    .overlay {
                        Image(systemName: "video.fill").foregroundColor(DesignTokens.Text.muted)
                    }
            }

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t("zehAni.highlights.momentCount", ["count": "\(reel.momentCount)"]))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                Text(statusText(reel.status)).font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(statusColor(reel.status))
                Text(formatDate(reel.createdAt)).font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
            }

            Spacer()

            if reel.shareToken != nil, reel.status == "completed" {
                Button {
                    shareReel(reel)
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundColor(DesignTokens.Primary.default)
                }
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
    }

    @MainActor
    private func loadReels() async {
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
    private func generateReel() async {
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

    private func shareReel(_ reel: HighlightReelItem) {
        guard let shareToken = reel.shareToken else { return }
        let shareText = localization.t("zehAni.highlights.share")
        let webHost = repos.configuration.environment == .production ? "bayit.tv" : "staging.bayit.tv"
        let shareUrl = "https://\(webHost)/zeh-ani/reels/\(shareToken)"
        let items: [Any] = [shareText, shareUrl]
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let root = scene.windows.first?.rootViewController {
            root.present(controller, animated: true)
        }
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
