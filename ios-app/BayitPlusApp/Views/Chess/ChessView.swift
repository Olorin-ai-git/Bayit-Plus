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
        } else if vm.game != nil {
            activeGameContent(vm)
        } else {
            lobbyContent(vm)
        }
    }

    // MARK: - Lobby

    private func lobbyContent(_ vm: ChessViewModel) -> some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.lg) {
                VStack(spacing: DesignTokens.Spacing.md) {
                    GlassButton(
                        localization.t("chess.createGame"),
                        variant: .primary
                    ) {
                        Task { await vm.createGame(color: "white", gameMode: "pvp", botDifficulty: nil) }
                    }

                    GlassButton(
                        localization.t("chess.joinGame"),
                        variant: .secondary
                    ) {
                        vm.showingJoinSheet = true
                    }
                }

                if vm.showingJoinSheet {
                    joinGameSection(vm)
                }
            }
            .padding(DesignTokens.Spacing.base)
        }
    }

    private func joinGameSection(_ vm: ChessViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization.t("chess.enterGameCode"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                HStack(spacing: DesignTokens.Spacing.sm) {
                    GlassTextField(
                        "XXXXXX",
                        text: Binding(
                            get: { vm.joinCode },
                            set: { vm.joinCode = $0.uppercased() }
                        )
                    )

                    GlassButton(localization.t("chess.joinGame"), variant: .primary) {
                        Task { await vm.joinGame(code: vm.joinCode) }
                    }
                    .disabled(vm.joinCode.count != 6)
                }
            }
        }
    }

    // MARK: - Active Game

    private func activeGameContent(_ vm: ChessViewModel) -> some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.md) {
                if let game = vm.game, game.gameMode == .pvp, game.status == .waiting {
                    gameCodeChip(game.gameCode)
                }

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
