import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main chess screen -- routes between lobby, loading, error, and active game.
struct ChessView: View {
    let gameId: String?

    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: ChessViewModel?

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
            // Keep this task alive until the view is removed from the
            // navigation stack. When that happens, Swift cancels the task
            // and we fall through to disconnect -- unlike onDisappear which
            // fires during internal SwiftUI re-layouts.
            try? await Task.sleep(for: .seconds(365 * 86400))
            await viewModel?.disconnect()
        }
    }

    // MARK: - Content Router

    @ViewBuilder
    private func gameContent(_ vm: ChessViewModel) -> some View {
        if vm.isLoading {
            loadingState
        } else if let error = vm.error {
            ErrorStateView(message: error, onRetry: {
                Task { await retryLoad(vm) }
            })
        } else if vm.game != nil {
            activeGameContent(vm)
        } else {
            ChessLobbyView(vm: vm)
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
        if let gameId {
            await vm.loadGame(gameId: gameId)
            if let code = vm.game?.gameCode {
                await vm.connectWebSocket(gameCode: code)
            }
        }
    }

    private func retryLoad(_ vm: ChessViewModel) async {
        if let gameId { await vm.loadGame(gameId: gameId) }
    }

    private func handleSquareTap(vm: ChessViewModel, row: Int, col: Int) {
        if let selected = vm.selectedSquare {
            if selected.row == row, selected.col == col {
                vm.selectedSquare = nil
            } else if let piece = vm.board[row][col], isOwnPiece(piece, turn: vm.currentTurn) {
                vm.selectedSquare = (row, col)
            } else {
                Task { await vm.sendMove(from: (selected.row, selected.col), to: (row, col)) }
            }
        } else if let piece = vm.board[row][col], isOwnPiece(piece, turn: vm.currentTurn) {
            vm.selectedSquare = (row, col)
        }
    }

    private func isOwnPiece(_ piece: Character, turn: PlayerColor) -> Bool {
        turn == .white ? piece.isUppercase : piece.isLowercase
    }
}
