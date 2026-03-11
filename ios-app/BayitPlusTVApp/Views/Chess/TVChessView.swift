import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main tvOS chess screen with lobby for creating/joining games
/// and full game board with focus-based d-pad navigation.
struct TVChessView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(AuthManager.self) private var authManager
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: ChessViewModel?
    @State private var showBotDifficulty = false
    @State private var showJoinEntry = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading {
                    loadingState
                } else if let error = vm.error, vm.game == nil {
                    tvErrorState(error) { Task { vm.error = nil } }
                } else if vm.game != nil {
                    gameContent(vm)
                } else {
                    lobbyContent(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task { setupViewModel() }
        .onDisappear { Task { await viewModel?.disconnect() } }
    }

    // MARK: - Setup

    private func setupViewModel() {
        guard viewModel == nil else { return }
        let vm = ChessViewModel(
            repository: repos.chess,
            authTokenProvider: repos.authTokenProvider
        )
        vm.localUserId = authManager.user?.id
        viewModel = vm
    }

    // MARK: - Lobby

    private func lobbyContent(_ vm: ChessViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            lobbyHeader
            lobbyActions(vm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private var lobbyHeader: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "checkerboard.rectangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("chess.title"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("chess.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func lobbyActions(_ vm: ChessViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                GlassButton(localization.t("chess.newGamePlayer"), variant: .primary, size: .medium) {
                    Task { await vm.createGame(color: "white", gameMode: "pvp", botDifficulty: nil) }
                }
                .tvFocusStyle()
                .accessibilityLabel("Start a new player versus player game")

                GlassButton(localization.t("chess.newGameBot"), variant: .secondary, size: .medium) {
                    showBotDifficulty.toggle()
                    showJoinEntry = false
                }
                .tvFocusStyle()
                .accessibilityLabel("Start a new game against the computer")

                GlassButton(localization.t("chess.joinGame"), variant: .ghost, size: .medium) {
                    showJoinEntry.toggle()
                    showBotDifficulty = false
                }
                .tvFocusStyle()
                .accessibilityLabel("Join an existing game by code")
            }

            if showBotDifficulty {
                botDifficultyButtons(vm)
            }

            if showJoinEntry {
                joinByCodeSection(vm)
            }
        }
    }

    private func joinByCodeSection(_ vm: ChessViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            TextField(localization.t("chess.enterGameCode"), text: Binding(
                get: { vm.joinCode },
                set: { vm.joinCode = $0.uppercased() }
            ))
            .textFieldStyle(.plain)
            .font(.system(size: TVDesignTokens.FontSize.base))
            .foregroundStyle(DesignTokens.Text.primary)
            .frame(width: 300)

            GlassButton(localization.t("chess.joinGame"), variant: .primary, size: .medium) {
                Task { await vm.joinGame(code: vm.joinCode) }
            }
            .tvFocusStyle()
            .disabled(vm.joinCode.count != 6)
        }
    }

    private func botDifficultyButtons(_ vm: ChessViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton(localization.t("chess.easy"), variant: .ghost, size: .medium) {
                Task { await vm.createGame(color: "white", gameMode: "bot", botDifficulty: "easy") }
            }
            .tvFocusStyle()
            .accessibilityLabel("Easy difficulty")

            GlassButton(localization.t("chess.medium"), variant: .ghost, size: .medium) {
                Task { await vm.createGame(color: "white", gameMode: "bot", botDifficulty: "medium") }
            }
            .tvFocusStyle()
            .accessibilityLabel("Medium difficulty")

            GlassButton(localization.t("chess.hard"), variant: .ghost, size: .medium) {
                Task { await vm.createGame(color: "white", gameMode: "bot", botDifficulty: "hard") }
            }
            .tvFocusStyle()
            .accessibilityLabel("Hard difficulty")
        }
    }

    // MARK: - Active Game

    private func gameContent(_ vm: ChessViewModel) -> some View {
        let flipped = vm.myColor == .black
        return VStack(spacing: TVDesignTokens.Spacing.lg) {
            playerInfoBar(
                player: flipped ? vm.game?.whitePlayer : vm.game?.blackPlayer, label: "Opponent"
            )
            boardSection(vm, isFlipped: flipped)
            playerInfoBar(
                player: flipped ? vm.game?.blackPlayer : vm.game?.whitePlayer, label: "You"
            )
            turnIndicator(vm)
            controlsSection(vm)

            if !vm.moveHistory.isEmpty {
                TVChessMoveHistoryView(moves: vm.moveHistory)
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
            }

            if let code = vm.game?.gameCode {
                gameCodeDisplay(code)
            }
        }
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private func boardSection(_ vm: ChessViewModel, isFlipped: Bool) -> some View {
        TVChessBoardView(
            board: vm.board,
            selectedSquare: vm.selectedSquare,
            currentTurn: vm.currentTurn,
            isFlipped: isFlipped,
            onSquareTap: { row, col in handleSquareTap(vm: vm, row: row, col: col) }
        )
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    private func controlsSection(_ vm: ChessViewModel) -> some View {
        TVChessControlsView(
            gameStatus: vm.gameStatus,
            drawOffered: vm.drawOffered,
            onResign: { Task { await vm.resign() } },
            onOfferDraw: { Task { await vm.offerDraw() } },
            onAcceptDraw: { Task { await vm.respondToDraw(accept: true) } },
            onDeclineDraw: { Task { await vm.respondToDraw(accept: false) } }
        )
    }
}
