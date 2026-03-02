import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main chess screen -- routes between lobby, loading, error, and active game.
struct ChessView: View {
    let gameId: String?

    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: ChessViewModel?
    @State private var inviteViewModel: ChessInviteViewModel?
    @State private var friends: [Friend] = []
    @State private var isFriendsLoading = true

    var body: some View {
        Group {
            if let vm = viewModel {
                gameContent(vm)
            } else {
                ProgressView()
                    .tint(DesignTokens.Text.primary)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task {
            await setupAndLoad()
            try? await Task.sleep(for: .seconds(365 * 86400))
            inviteViewModel?.stopPolling()
            await viewModel?.disconnect()
        }
        .onChange(of: inviteViewModel?.acceptedGame?.gameCode) { _, newCode in
            guard let newCode, let game = inviteViewModel?.acceptedGame else { return }
            viewModel?.applyGameState(game)
            Task { await viewModel?.connectWebSocket(gameCode: newCode) }
        }
        .onChange(of: viewModel?.pendingWhatsAppMessage) { _, message in
            guard let message else { return }
            openWhatsApp(message: message)
            viewModel?.pendingWhatsAppMessage = nil
        }
    }

    // MARK: - Content Router

    private func gameContent(_ vm: ChessViewModel) -> some View {
        Group {
            if vm.isLoading {
                loadingState
            } else if let error = vm.error {
                ErrorStateView(message: error, onRetry: {
                    Task { await retryLoad(vm) }
                })
            } else if vm.game != nil {
                activeGameContent(vm)
            } else {
                ChessLobbyView(
                    vm: vm,
                    friends: friends,
                    isFriendsLoading: isFriendsLoading,
                    onInviteFriend: { friendId, color, timeControl in
                        handleInviteFriend(vm: vm, friendId: friendId, color: color, timeControl: timeControl)
                    }
                )
            }
        }
        .overlay(alignment: .top) {
            if let inviteVM = inviteViewModel {
                ChessInviteBannerView(
                    invite: inviteVM.pendingInvite,
                    onAccept: { code in Task { await inviteVM.acceptInvite(gameCode: code) } },
                    onDecline: { code in Task { await inviteVM.declineInvite(gameCode: code) } }
                )
            }
        }
    }

    // MARK: - Active Game

    private func activeGameContent(_ vm: ChessViewModel) -> some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.md) {
                if let game = vm.game, game.gameMode == .pvp, game.status == .waiting {
                    gameCodeChip(game.gameCode)
                }

                ChessPlayerBar(
                    player: vm.game?.blackPlayer,
                    label: localization.t("chess.opponent"),
                    isCurrentTurn: vm.currentTurn == .black && vm.gameStatus == .active,
                    timeRemainingMs: vm.blackTimeRemainingMs
                )
                .padding(.horizontal, DesignTokens.Spacing.sm)

                ChessBoardView(
                    board: vm.board,
                    selectedSquare: vm.selectedSquare,
                    lastMove: vm.lastMove,
                    currentTurn: vm.currentTurn,
                    onSquareTap: { row, col in handleSquareTap(vm: vm, row: row, col: col) }
                )
                .padding(.horizontal, DesignTokens.Spacing.sm)

                ChessPlayerBar(
                    player: vm.game?.whitePlayer,
                    label: localization.t("chess.you"),
                    isCurrentTurn: vm.currentTurn == .white && vm.gameStatus == .active,
                    timeRemainingMs: vm.whiteTimeRemainingMs
                )
                .padding(.horizontal, DesignTokens.Spacing.sm)

                statusIndicator(vm)

                ChessControlsView(
                    gameStatus: vm.gameStatus,
                    drawOffered: vm.drawOffered,
                    onResign: { Task { await vm.resign() } },
                    onOfferDraw: { Task { await vm.offerDraw() } },
                    onAcceptDraw: { Task { await vm.respondToDraw(accept: true) } },
                    onDeclineDraw: { Task { await vm.respondToDraw(accept: false) } }
                )

                if !vm.moveHistory.isEmpty {
                    ChessMoveHistoryView(moves: vm.moveHistory)
                        .padding(.horizontal, DesignTokens.Spacing.sm)
                }

                if vm.game?.chatEnabled == true {
                    ChessChatPanel(
                        messages: vm.chatMessages,
                        currentUserId: vm.currentUserId ?? "",
                        isBotGame: vm.game?.gameMode == .bot,
                        botChatLimitReached: vm.botChatLimitReached,
                        isExpanded: Binding(
                            get: { vm.isChatExpanded },
                            set: { vm.isChatExpanded = $0 }
                        ),
                        onSend: { text in Task { await vm.sendChatMessage(text) } }
                    )
                    .padding(.horizontal, DesignTokens.Spacing.sm)
                }
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            .padding(.bottom, 100)
        }
    }

    // MARK: - Actions

    private func setupAndLoad() async {
        guard viewModel == nil else { return }
        let vm = ChessViewModel(
            repository: repos.chess,
            authTokenProvider: repos.authTokenProvider
        )
        viewModel = vm
        let inviteVM = ChessInviteViewModel(repository: repos.chess)
        inviteViewModel = inviteVM
        inviteVM.startPolling()
        if let gameId {
            await vm.loadGame(gameId: gameId)
            if let code = vm.game?.gameCode {
                await vm.connectWebSocket(gameCode: code)
            }
        }
        await loadFriends()
    }

    private func loadFriends() async {
        do {
            friends = try await repos.friends.fetchFriends()
        } catch {
            friends = []
        }
        isFriendsLoading = false
    }

    private func handleInviteFriend(vm: ChessViewModel, friendId: String, color: String, timeControl: Int?) {
        Task {
            await vm.inviteFriend(friendUserId: friendId, color: color, timeControl: timeControl)
        }
    }

    private func retryLoad(_ vm: ChessViewModel) async {
        if let gameId { await vm.loadGame(gameId: gameId) }
    }

    private func openWhatsApp(message: String) {
        guard let encoded = message.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "https://wa.me/?text=\(encoded)") else { return }
        UIApplication.shared.open(url)
    }
}
