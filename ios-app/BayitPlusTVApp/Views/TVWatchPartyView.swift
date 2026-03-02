import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Watch Party screen with create/join sheets, chat input, and leave functionality.
/// Reuses WatchPartyViewModel from shared ViewModels.
struct TVWatchPartyView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: WatchPartyViewModel?
    @State private var chatText = ""

    var body: some View {
        ZStack {
            mainContent
            sheetOverlays
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = WatchPartyViewModel(repository: repos.watchParty)
            }
            await viewModel?.loadMyParties()
        }
    }

    @ViewBuilder
    private var mainContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.activeParty == nil {
                    loadingState
                } else if let error = vm.error, vm.activeParty == nil, vm.myParties.isEmpty {
                    tvErrorState(error) { Task { await vm.loadMyParties() } }
                } else if let party = vm.activeParty {
                    activePartyContent(party, vm)
                } else {
                    lobbyContent(vm)
                }
            }
        }
    }

    @ViewBuilder
    private var sheetOverlays: some View {
        if let vm = viewModel {
            @Bindable var bindableVM = vm
            TVCreatePartySheet(isPresented: $bindableVM.showCreateSheet) { request in
                Task { await vm.createParty(request) }
            }
            TVJoinPartySheet(isPresented: $bindableVM.showJoinSheet) { code in
                Task { await vm.joinParty(roomCode: code) }
            }
        }
    }

    // MARK: - Active Party

    private func activePartyContent(_ party: WatchParty, _ vm: WatchPartyViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            partyHeader(party)
            participantsList(vm.participants)
            chatSection(vm.chatMessages, chatEnabled: party.chatEnabled, vm: vm)
            leaveButton(vm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private func partyHeader(_ party: WatchParty) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "tv.and.hifispeaker.fill").font(.system(size: TVDesignTokens.FontSize.hero)).foregroundStyle(DesignTokens.Primary.default)
            Text(party.contentTitle ?? party.contentId).font(.system(size: TVDesignTokens.FontSize.display, weight: .bold)).foregroundStyle(DesignTokens.Text.primary)
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Text("\(party.participantCount) watching").font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.secondary)
                Text(localization.t("watchParty.roomCode", ["code": party.roomCode])).font(.system(size: TVDesignTokens.FontSize.base)).foregroundStyle(DesignTokens.Text.muted)
            }
        }.frame(maxWidth: .infinity).padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func participantsList(_ participants: [ParticipantState]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("watchParty.participants")).font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold)).foregroundStyle(DesignTokens.Text.muted).textCase(.uppercase)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(participants) { participant in
                        TVUserAvatarRow(name: participant.userName, avatarURL: nil, isOnline: nil)
                            .frame(width: 200)
                    }
                }
            }
        }
    }

    private func chatSection(_ messages: [PartyChatMessage], chatEnabled: Bool, vm: WatchPartyViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("channelChat.title")).font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold)).foregroundStyle(DesignTokens.Text.muted).textCase(.uppercase)
            LazyVStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                ForEach(messages.suffix(5)) { msg in
                    chatMessageRow(msg)
                }
            }
            if chatEnabled {
                TVMessageInputBar(text: $chatText, placeholder: localization.t("channelChat.sendMessage")) { text in
                    Task { await vm.sendChat(text) }
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

    private func leaveButton(_ vm: WatchPartyViewModel) -> some View {
        GlassButton("Leave Party", variant: .secondary, size: .medium) {
            Task { await vm.leaveParty() }
        }
        .tvFocusStyle()
        .accessibilityLabel("Leave watch party")
    }

    // MARK: - Lobby

    private func lobbyContent(_ vm: WatchPartyViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            lobbyHeader
            lobbyActions(vm)
            if !vm.myParties.isEmpty { existingPartiesList(vm) } else { emptyState }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private var lobbyHeader: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "tv.and.hifispeaker.fill").font(.system(size: TVDesignTokens.FontSize.hero)).foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("watchParty.title")).font(.system(size: TVDesignTokens.FontSize.display, weight: .bold)).foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("watchParty.subtitle")).font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.secondary)
        }.frame(maxWidth: .infinity)
    }

    private func lobbyActions(_ vm: WatchPartyViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton("Create Party", variant: .primary, size: .medium) { vm.showCreateSheet = true }
                .tvFocusStyle().accessibilityLabel("Create a new watch party")
            GlassButton("Join Party", variant: .secondary, size: .medium) { vm.showJoinSheet = true }
                .tvFocusStyle().accessibilityLabel("Join an existing watch party")
        }
    }

    private func existingPartiesList(_ vm: WatchPartyViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("watchParty.myParties")).font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold)).foregroundStyle(DesignTokens.Text.muted).textCase(.uppercase)
            LazyVStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(vm.myParties) { party in partyCard(party, vm: vm) }
            }
        }
    }

    private func partyCard(_ party: WatchParty, vm: WatchPartyViewModel) -> some View {
        Button { Task { await vm.joinParty(roomCode: party.roomCode) } } label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(party.contentTitle ?? party.contentId).font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium)).foregroundStyle(DesignTokens.Text.primary).lineLimit(1)
                    Text("\(party.participantCount) participants").font(.system(size: TVDesignTokens.FontSize.base)).foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
                if party.isActive { Circle().fill(DesignTokens.Success.default).frame(width: 16, height: 16) }
            }.padding(TVDesignTokens.Spacing.lg).frame(maxWidth: .infinity).background(DesignTokens.Glass.bg).clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }.tvCardStyle()
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("watchParty.noParties")).font(.system(size: TVDesignTokens.FontSize.xl)).foregroundStyle(DesignTokens.Text.secondary)
            Text(localization.t("watchParty.createOrJoin")).font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.muted).multilineTextAlignment(.center).frame(maxWidth: 600)
        }.frame(maxWidth: .infinity).padding(.top, TVDesignTokens.Spacing.xl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
            Text(localization.t("watchParty.loading")).font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.muted)
        }.frame(maxWidth: .infinity, minHeight: 400)
    }
}
