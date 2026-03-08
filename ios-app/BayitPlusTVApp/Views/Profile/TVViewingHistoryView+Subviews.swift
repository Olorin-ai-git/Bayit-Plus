import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - History Row

extension TVViewingHistoryView {
    func historyRow(_ item: WatchHistoryItem) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            CachedAsyncImage(url: URL(string: item.thumbnail ?? "")) { phase in
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

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(item.title ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                if let type = item.type {
                    Text(type.capitalized)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                if let progress = item.progress, progress > 0 {
                    progressBar(progress: progress)
                }
            }

            Spacer()

            if let lastWatched = item.lastWatched,
               let date = ISO8601DateFormatter().date(from: lastWatched)
            {
                VStack(alignment: .trailing, spacing: 4) {
                    Text(date.formatted(.dateTime.month().day()))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)

                    Text(date.formatted(.dateTime.hour().minute()))
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
        .padding(TVDesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private func progressBar(progress: Double) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 4)

                    Rectangle()
                        .fill(DesignTokens.Primary.p400)
                        .frame(
                            width: geo.size.width * CGFloat(progress),
                            height: 4
                        )
                }
            }
            .frame(height: 4)
            .cornerRadius(2)

            Text("\(Int(progress * 100))%")
                .font(.system(size: TVDesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
        }
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

            Button(localization.t("common.retry")) {
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
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("profile.noViewingHistoryDescription"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Filter

enum HistoryFilter: String, CaseIterable {
    case all
    case movies
    case shows
    case live

    func label(_ localization: LocalizationManager) -> String {
        switch self {
        case .all: localization.t("common.all")
        case .movies: localization.t("content.filters.movies")
        case .shows: localization.t("content.filters.series")
        case .live: localization.t("liveTV.title")
        }
    }
}
