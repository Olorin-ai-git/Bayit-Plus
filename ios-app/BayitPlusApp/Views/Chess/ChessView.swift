import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main chess game screen containing opponent info, board, player info,
/// game controls, and move history.
struct ChessView: View {
    let gameId: String?

    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
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
        .task { await setupAndLoad() }
        .onDisappear { Task { await viewModel?.disconnect() } }
    }

    // MARK: - Content

    @ViewBuilder
    private func gameContent(_ vm: ChessViewModel) -> some View {
        if vm.isLoading {
            ProgressView()
                .tint(DesignTokens.Text.primary)
        } else if let error = vm.error {
            ErrorStateView(message: error, onRetry: {
                Task { await retryLoad(vm) }
            })
        } else {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.md) {
                    playerInfoBar(
                        player: vm.game?.blackPlayer,
                        label: localization.t("chess.opponent")
                    )

                    ChessBoardView(
                        board: vm.board,
                        selectedSquare: vm.selectedSquare,
                        currentTurn: vm.currentTurn,
                        onSquareTap: { row, col in handleSquareTap(vm: vm, row: row, col: col) }
                    )
                    .padding(.horizontal, DesignTokens.Spacing.sm)

                    playerInfoBar(
                        player: vm.game?.whitePlayer,
                        label: localization.t("chess.you")
                    )

                    turnIndicator(vm)

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
                }
                .padding(.vertical, DesignTokens.Spacing.md)
            }
        }
    }

    // MARK: - Subviews

    private func playerInfoBar(player: ChessPlayer?, label: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Text(player?.userName ?? label)
                .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)
            Spacer()
            if let player {
                OnlineStatusBadge(isOnline: player.isConnected)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .accessibilityElement(children: .combine)
    }

    private func turnIndicator(_ vm: ChessViewModel) -> some View {
        Text(vm.gameStatus == .active
            ? (vm.currentTurn == .white
                ? localization.t("chess.whiteTurn")
                : localization.t("chess.blackTurn"))
            : localization.t("chess.gameOver"))
            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
            .foregroundStyle(DesignTokens.Text.secondary)
            .accessibilityLabel("Game status")
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
            Task { await vm.sendMove(from: (selected.row, selected.col), to: (row, col)) }
        } else if vm.board[row][col] != nil {
            vm.selectedSquare = (row, col)
        }
    }
}
