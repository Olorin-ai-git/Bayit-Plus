import BayitDesignSystem
import SwiftUI

/// tvOS Watch Party screen showing active party or lobby for creating/joining parties.
/// Reuses WatchPartyViewModel from shared ViewModels.
struct TVWatchPartyView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: WatchPartyViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.activeParty == nil {
                    loadingState
                } else if let error = vm.error,
                          vm.activeParty == nil,
                          vm.myParties.isEmpty {
                    tvErrorState(error) {
                        Task { await vm.loadMyParties() }
                    }
                } else if let party = vm.activeParty {
                    activePartyContent(party, vm)
                } else {
                    lobbyContent(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = WatchPartyViewModel(repository: repos.watchParty)
            }
            await viewModel?.loadMyParties()
        }
    }

    private func activePartyContent(_ party: WatchParty, _ vm: WatchPartyViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            partyHeader(party)

            if !vm.participants.isEmpty {
                participantsList(vm.participants)
            }

            if !vm.chatMessages.isEmpty {
                chatSection(vm.chatMessages)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private func partyHeader(_ party: WatchParty) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "tv.and.hifispeaker.fill").font(.system(size: TVDesignTokens.FontSize.hero)).foregroundStyle(DesignTokens.Primary.default)
            Text(party.contentTitle ?? party.contentId).font(.system(size: TVDesignTokens.FontSize.display, weight: .bold)).foregroundStyle(DesignTokens.Text.primary)
            Text("\(party.participantCount) watching").font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.secondary)
        }.frame(maxWidth: .infinity).padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func participantsList(_ participants: [ParticipantState]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text("PARTICIPANTS")
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(participants) { participant in
                        participantCard(participant)
                    }
                }
            }
        }
    }

    private func participantCard(_ participant: ParticipantState) -> some View {
        let initial = String(participant.userName.prefix(1)).uppercased()
        return VStack(spacing: TVDesignTokens.Spacing.sm) {
            Circle().fill(DesignTokens.Glass.bgMedium).frame(width: 80, height: 80)
                .overlay(Text(initial).font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold)).foregroundStyle(DesignTokens.Primary.p400))
            Text(participant.userName).font(.system(size: TVDesignTokens.FontSize.base)).foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private func chatSection(_ messages: [PartyChatMessage]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text("CHAT")
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)

            LazyVStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                ForEach(messages.suffix(5)) { msg in
                    chatMessageRow(msg)
                }
            }
        }
    }

    private func chatMessageRow(_ message: PartyChatMessage) -> some View {
        HStack(alignment: .top, spacing: TVDesignTokens.Spacing.md) {
            Text(message.userName).font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold)).foregroundStyle(DesignTokens.Primary.default)
            Text(message.message).font(.system(size: TVDesignTokens.FontSize.base)).foregroundStyle(DesignTokens.Text.primary)
        }.padding(TVDesignTokens.Spacing.md).frame(maxWidth: .infinity, alignment: .leading).background(DesignTokens.Glass.bg).clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private func lobbyContent(_ vm: WatchPartyViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            lobbyHeader

            if !vm.myParties.isEmpty {
                existingPartiesList(vm)
            } else {
                emptyState
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private var lobbyHeader: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "tv.and.hifispeaker.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text("Watch Party")
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Watch together with friends and family")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func existingPartiesList(_ vm: WatchPartyViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("MY PARTIES")
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)

            LazyVStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(vm.myParties) { party in
                    partyCard(party)
                }
            }
        }
    }

    private func partyCard(_ party: WatchParty) -> some View {
        Button {} label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(party.contentTitle ?? party.contentId).font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium)).foregroundStyle(DesignTokens.Text.primary).lineLimit(1)
                    Text("\(party.participantCount) participants").font(.system(size: TVDesignTokens.FontSize.base)).foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
                if party.isActive { Circle().fill(DesignTokens.Success.default).frame(width: 16, height: 16) }
            }.padding(TVDesignTokens.Spacing.lg).frame(maxWidth: .infinity).background(DesignTokens.Glass.bg).clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }.buttonStyle(.card).tvFocusStyle()
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text("No active watch parties").font(.system(size: TVDesignTokens.FontSize.xl)).foregroundStyle(DesignTokens.Text.secondary)
            Text("Create or join a party from your mobile device").font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.muted).multilineTextAlignment(.center).frame(maxWidth: 600)
        }.frame(maxWidth: .infinity).padding(.top, TVDesignTokens.Spacing.xl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text("Loading Watch Parties...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
