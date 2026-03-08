import BayitDesignSystem
import SwiftUI

/// iPad-optimized chess view - wraps ChessView with wider layout
struct IPadChessView: View {
    let gameId: String?

    var body: some View {
        ChessView(gameId: gameId)
            .background(DesignTokens.Background.primary)
    }
}
