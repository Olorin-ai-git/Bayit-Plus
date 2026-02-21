import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Chess Subviews & Actions

extension TVChessView {
    func playerInfoBar(player: ChessPlayer?, label: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Text(player?.userName ?? label)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)
            Spacer()
            if let player {
                TVOnlineStatusBadge(isOnline: player.isConnected)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .accessibilityElement(children: .combine)
    }

    func turnIndicator(_ vm: ChessViewModel) -> some View {
        Text(vm.gameStatus == .active
            ? (vm.currentTurn == .white ? localization.t("chess.whiteTurn") : localization.t("chess.blackTurn"))
            : localization.t("chess.gameOver"))
            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
            .foregroundStyle(DesignTokens.Text.secondary)
            .accessibilityLabel("Game status")
    }

    func gameCodeDisplay(_ code: String) -> some View {
        Text(localization.t("chess.code", ["code": code]))
            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium, design: .monospaced))
            .foregroundStyle(DesignTokens.Text.muted)
            .padding(.top, TVDesignTokens.Spacing.sm)
    }

    func handleSquareTap(vm: ChessViewModel, row: Int, col: Int) {
        if let selected = vm.selectedSquare {
            Task { await vm.sendMove(from: (selected.row, selected.col), to: (row, col)) }
        } else if vm.board[row][col] != nil {
            vm.selectedSquare = (row, col)
        }
    }

    var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("common.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
