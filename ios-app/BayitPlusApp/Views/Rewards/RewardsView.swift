import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Rewards / Gamification screen with points display, level progress,
/// badge collection grid, and streak tracker.
struct RewardsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: RewardsViewModel?
    @State private var celebratingBadge: Badge?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.balance == nil {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, vm.balance == nil {
                        ErrorStateView(message: error) {
                            Task { await vm.load() }
                        }
                    } else {
                        pointsHeader(vm)
                        levelProgress(vm)
                        streakTracker(vm)
                        badgeCollection(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .overlay {
            if let badge = celebratingBadge {
                badgeCelebration(badge)
            }
        }
        .task {
            if viewModel == nil {
                viewModel = RewardsViewModel(repository: repos.reward)
            }
            await viewModel?.load()
        }
    }

    // MARK: - Points Header

    private func pointsHeader(_ vm: RewardsViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "star.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(DesignTokens.gold)

                Text("\(vm.points)")
                    .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("rewards.points"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Level Progress

    private func levelProgress(_ vm: RewardsViewModel) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack {
                    Text("\(localization.t("rewards.level")) \(vm.level)")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    Text(String(format: "%.0f%%", vm.levelProgress * 100))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                            .fill(DesignTokens.Glass.bgMedium)
                            .frame(height: DesignTokens.Spacing.sm)

                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                            .fill(
                                LinearGradient(
                                    colors: [
                                        DesignTokens.Primary.p500,
                                        DesignTokens.Primary.p400
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(
                                width: geometry.size.width * vm.levelProgress,
                                height: DesignTokens.Spacing.sm
                            )
                    }
                }
                .frame(height: DesignTokens.Spacing.sm)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Streak Tracker

    private func streakTracker(_ vm: RewardsViewModel) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "flame.fill")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(
                        vm.streakDays > 0
                            ? DesignTokens.Warning.default
                            : DesignTokens.Text.muted
                    )

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text("\(vm.streakDays) \(localization.t("rewards.days"))")
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("rewards.streak"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Badge Collection

    private func badgeCollection(_ vm: RewardsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(localization.t("rewards.badges"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .textCase(.uppercase)
                Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            if vm.badges.isEmpty {
                GlassCard {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "trophy")
                            .font(.system(size: 32))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(localization.t("rewards.noBadges"))
                            .font(.system(size: DesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            } else {
                let columns = [
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
                ]

                LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
                    ForEach(vm.badges) { badge in
                        badgeItem(badge)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private func badgeItem(_ badge: Badge) -> some View {
        GlassCard(padding: DesignTokens.Spacing.md) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: badge.icon ?? "star.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.gold)

                Text(badge.name ?? "")
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
        }
        .onTapGesture {
            HapticFeedbackService.impact(style: .light)
            celebratingBadge = badge
        }
    }

    // MARK: - Badge Celebration

    private func badgeCelebration(_ badge: Badge) -> some View {
        ZStack {
            Color.black.opacity(0.75)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation { celebratingBadge = nil }
                }

            VStack(spacing: DesignTokens.Spacing.lg) {
                Image(systemName: badge.icon ?? "star.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(DesignTokens.gold)
                    .scaleEffect(1.2)

                Text(badge.name ?? "")
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let description = badge.description {
                    Text(description)
                        .font(.system(size: DesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)
                }

                GlassButton(
                    localization.t("common.dismiss"),
                    variant: .secondary
                ) {
                    withAnimation { celebratingBadge = nil }
                }
            }
            .glassCard()
            .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        .transition(.opacity.combined(with: .scale(scale: 0.9)))
        .animation(.spring(duration: 0.4, bounce: 0.2), value: celebratingBadge != nil)
    }
}
