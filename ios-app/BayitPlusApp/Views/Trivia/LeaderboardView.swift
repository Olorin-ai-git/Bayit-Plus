import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Trivia leaderboard view with ranked entries, top 3 highlighting, and pull-to-refresh.
struct LeaderboardView: View {
    @State private var viewModel: LeaderboardViewModel

    @Environment(LocalizationManager.self) private var localization

    init(viewModel: LeaderboardViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary
                    .ignoresSafeArea()

                if viewModel.isLoading && viewModel.entries.isEmpty {
                    loadingView
                } else if let error = viewModel.error, viewModel.entries.isEmpty {
                    errorView(error)
                } else {
                    leaderboardList
                }
            }
            .navigationTitle(localization.t("trivia.leaderboard"))
            .navigationBarTitleDisplayMode(.large)
            .task {
                if viewModel.entries.isEmpty {
                    await viewModel.load()
                }
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        ProgressView()
            .tint(DesignTokens.Primary.p400)
            .scaleEffect(1.5)
    }

    // MARK: - Error View

    private func errorView(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.ErrorColor.default)

            Text(message)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
        }
        .padding(DesignTokens.Spacing.xl)
    }

    // MARK: - Leaderboard List

    private var leaderboardList: some View {
        ScrollView {
            LazyVStack(spacing: DesignTokens.Spacing.md) {
                headerView

                ForEach(viewModel.entries) { entry in
                    entryCard(entry)
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .refreshable {
            await viewModel.refresh()
        }
    }

    // MARK: - Header

    private var headerView: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "trophy.fill")
                .font(.system(size: 32))
                .foregroundStyle(DesignTokens.gold)

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t("trivia.topPlayers"))
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text("\(viewModel.entries.count) players")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()
        }
        .padding(.bottom, DesignTokens.Spacing.md)
    }

    // MARK: - Entry Card

    private func entryCard(_ entry: LeaderboardEntry) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                rankView(entry.rank)

                AsyncImage(url: URL(string: entry.avatarUrl ?? "")) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .frame(width: 48, height: 48)
                .clipShape(Circle())

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Text(entry.displayName)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if entry.isCurrentUser == true {
                            GlassBadge(text: "YOU", variant: .success)
                        }
                    }

                    HStack(spacing: DesignTokens.Spacing.md) {
                        statsView(
                            icon: "star.fill",
                            value: String(format: "%.0f", entry.rating),
                            color: DesignTokens.gold
                        )

                        statsView(
                            icon: "gamecontroller.fill",
                            value: "\(entry.gamesWon)/\(entry.gamesPlayed)",
                            color: DesignTokens.Primary.p400
                        )

                        statsView(
                            icon: "percent",
                            value: String(format: "%.0f%%", entry.winRate * 100),
                            color: DesignTokens.Success.default
                        )
                    }
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .strokeBorder(topThreeAccent(for: entry.rank), lineWidth: entry.isCurrentUser == true ? 2 : 0)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Rank \(entry.rank): \(entry.displayName), rating \(Int(entry.rating)), \(entry.gamesWon) wins out of \(entry.gamesPlayed) games")
    }

    // MARK: - Rank View

    private func rankView(_ rank: Int) -> some View {
        ZStack {
            Circle()
                .fill(rankBackground(for: rank))
                .frame(width: 40, height: 40)

            if rank <= 3 {
                Image(systemName: medalIcon(for: rank))
                    .font(.system(size: 20))
                    .foregroundStyle(medalColor(for: rank))
            } else {
                Text("\(rank)")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
    }

    private func rankBackground(for rank: Int) -> Color {
        if rank <= 3 {
            return medalColor(for: rank).opacity(0.2)
        }
        return DesignTokens.Glass.bg
    }

    private func medalIcon(for rank: Int) -> String {
        switch rank {
        case 1: return "1.circle.fill"
        case 2: return "2.circle.fill"
        case 3: return "3.circle.fill"
        default: return "circle"
        }
    }

    private func medalColor(for rank: Int) -> Color {
        switch rank {
        case 1: return DesignTokens.gold // Gold
        case 2: return Color.gray // Silver
        case 3: return Color.orange.opacity(0.7) // Bronze
        default: return DesignTokens.Text.muted
        }
    }

    private func topThreeAccent(for rank: Int) -> Color {
        if rank <= 3 {
            return medalColor(for: rank)
        }
        return .clear
    }

    // MARK: - Stats View

    private func statsView(icon: String, value: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(color)

            Text(value)
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }
}
