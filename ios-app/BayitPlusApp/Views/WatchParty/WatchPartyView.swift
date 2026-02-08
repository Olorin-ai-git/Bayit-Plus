import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main watch party screen -- shows active party with chat, or party creation/join options.
struct WatchPartyView: View {
    @State private var viewModel: WatchPartyViewModel
    @State private var chatText = ""
    @Environment(\.localizationManager) private var localization

    init(repository: any WatchPartyRepository) {
        _viewModel = State(initialValue: WatchPartyViewModel(repository: repository))
    }

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if viewModel.isLoading && viewModel.activeParty == nil {
                ProgressView()
                    .tint(DesignTokens.Text.secondary)
            } else if let error = viewModel.error,
                      viewModel.activeParty == nil,
                      viewModel.myParties.isEmpty {
                ErrorStateView(
                    message: error,
                    onRetry: { Task { await viewModel.loadMyParties() } }
                )
            } else if let party = viewModel.activeParty {
                ActivePartySection(
                    party: party,
                    participants: viewModel.participants,
                    chatMessages: viewModel.chatMessages,
                    chatText: $chatText,
                    onSendChat: { msg in Task { await viewModel.sendChat(msg) } },
                    onLeave: { Task { await viewModel.leaveParty() } }
                )
            } else {
                lobbyContent
            }

            CreatePartySheet(
                isPresented: $viewModel.showCreateSheet,
                onCreate: { request in Task { await viewModel.createParty(request) } }
            )

            JoinPartySheet(
                isPresented: $viewModel.showJoinSheet,
                onJoin: { code in Task { await viewModel.joinParty(roomCode: code) } }
            )
        }
        .navigationTitle(localization?.t("watchParty.title") ?? "Watch Party")
        .task { await viewModel.loadMyParties() }
    }

    // MARK: - Lobby

    private var lobbyContent: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.lg) {
                lobbyActions
                existingPartiesList
                emptyState
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.lg)
        }
    }

    private var lobbyActions: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                localization?.t("watchParty.createNew") ?? "Create Party",
                variant: .primary,
                size: .medium,
                icon: Image(systemName: "plus.circle"),
                action: { viewModel.showCreateSheet = true }
            )
            .accessibilityLabel("Create a new watch party")

            GlassButton(
                localization?.t("watchParty.joinExisting") ?? "Join Party",
                variant: .secondary,
                size: .medium,
                icon: Image(systemName: "person.badge.plus"),
                action: { viewModel.showJoinSheet = true }
            )
            .accessibilityLabel("Join an existing watch party")
        }
    }

    @ViewBuilder
    private var existingPartiesList: some View {
        if !viewModel.myParties.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization?.t("watchParty.myParties") ?? "My Parties")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                ForEach(viewModel.myParties) { party in
                    GlassCard {
                        HStack {
                            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                                Text(party.contentTitle ?? party.contentId)
                                    .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                                    .foregroundStyle(DesignTokens.Text.primary)
                                    .lineLimit(1)
                                Text("\(party.participantCount) participants")
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Text.muted)
                            }
                            Spacer()
                            OnlineStatusBadge(isOnline: party.isActive)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var emptyState: some View {
        if viewModel.myParties.isEmpty {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "tv.and.hifispeaker.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization?.t("watchParty.emptyTitle") ?? "No watch parties")
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization?.t("watchParty.emptySubtitle") ?? "Create or join a party to watch together")
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 40)
        }
    }
}
