import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - History Row

extension TVViewingHistoryView {
    func historyRow(_ item: HistoryItem) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            // Thumbnail
            CachedAsyncImage(url: URL(string: item.thumbnail)) { phase in
                if case let .success(image) = phase {
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    Rectangle()
                        .fill(DesignTokens.Glass.bgMedium)
                        .overlay(
                            Image(systemName: "film")
                                .font(.system(size: 32))
                                .foregroundStyle(DesignTokens.Text.muted)
                        )
                }
            }
            .frame(width: 160, height: 90)
            .cornerRadius(TVDesignTokens.Radius.md)

            // Info
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(item.title)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    if let year = item.year {
                        Text("\(year)")
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    Text("\u{2022}")
                        .foregroundStyle(DesignTokens.Text.muted)

                    Text(item.type.capitalized)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                // Progress bar
                if item.progress > 0 {
                    VStack(alignment: .leading, spacing: 4) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Rectangle()
                                    .fill(Color.white.opacity(0.2))
                                    .frame(height: 4)

                                Rectangle()
                                    .fill(DesignTokens.Primary.p400)
                                    .frame(width: geo.size.width * CGFloat(item.progress), height: 4)
                            }
                        }
                        .frame(height: 4)
                        .cornerRadius(2)

                        Text("\(Int(item.progress * 100))% complete")
                            .font(.system(size: TVDesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }

            Spacer()

            // Watched date
            VStack(alignment: .trailing, spacing: 4) {
                Text(item.watchedAt.formatted(.dateTime.month().day()))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(item.watchedAt.formatted(.dateTime.hour().minute()))
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.vertical, TVDesignTokens.Spacing.xs)
    }
}

// MARK: - State Views

extension TVViewingHistoryView {
    var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)

            Text(localization.t("profile.loadingHistory"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            Button("Retry") {
                Task { await loadHistory() }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    var emptyView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("profile.noViewingHistory"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            Text(localization.t("profile.noViewingHistoryDescription"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Models

struct HistoryItem: Identifiable {
    let id: String
    let contentId: String
    let title: String
    let thumbnail: String
    let type: String
    let year: Int?
    let progress: Double
    let watchedAt: Date
}

enum HistoryFilter: String {
    case all = "All"
    case movies = "Movies"
    case shows = "TV Shows"
    case live = "Live TV"
}
