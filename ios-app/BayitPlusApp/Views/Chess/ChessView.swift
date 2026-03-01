import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main chess screen — routes between lobby, loading, error, and active game.
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
        .toolbar(.hidden, for: .navigationBar)
        .task { await setupAndLoad() }
        .onDisappear { Task { await viewModel?.disconnect() } }
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

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Gradient.ctaStart)
                .scaleEffect(1.2)
            Text(localization.t("chess.waitingForOpponent"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
                    isCurrentTurn: vm.currentTurn == .black && vm.gameStatus == .active
                )
                .padding(.horizontal, DesignTokens.Spacing.sm)

                ChessBoardView(
                    board: vm.board,
                    selectedSquare: vm.selectedSquare,
                    currentTurn: vm.currentTurn,
                    onSquareTap: { row, col in handleSquareTap(vm: vm, row: row, col: col) }
                )
                .padding(.horizontal, DesignTokens.Spacing.sm)

                ChessPlayerBar(
                    player: vm.game?.whitePlayer,
                    label: localization.t("chess.you"),
                    isCurrentTurn: vm.currentTurn == .white && vm.gameStatus == .active
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
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            .padding(.bottom, 100)
        }
    }

    // MARK: - Subviews

    private func gameCodeChip(_ code: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("chess.gameCode") + ": \(code)")
                .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
            GlassButton(localization.t("chess.copyCode"), variant: .ghost) {
                UIPasteboard.general.string = code
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    private func statusIndicator(_ vm: ChessViewModel) -> some View {
        Group {
            if vm.gameStatus == .active {
                let turn = vm.currentTurn == .white
                    ? localization.t("chess.whiteTurn")
                    : localization.t("chess.blackTurn")
                Text(turn)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Gradient.ctaStart)
            } else {
                Text(statusLabel(vm.gameStatus))
                    .font(.system(size: DesignTokens.FontSize.base, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
        .accessibilityLabel("Game status")
    }

    private func statusLabel(_ status: ChessGameStatus) -> String {
        switch status {
        case .checkmate: return localization.t("chess.checkmate")
        case .stalemate: return localization.t("chess.stalemate")
        case .draw: return localization.t("chess.draw")
        case .resigned: return localization.t("chess.resigned")
        default: return localization.t("chess.gameOver")
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
            Task { await vm.sendMove(from: (selected.row, selected.col), to: (row, col)) }
        } else if vm.board[row][col] != nil {
            vm.selectedSquare = (row, col)
        }
    }
}
