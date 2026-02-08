import BayitDesignSystem
import SwiftUI

/// Renders a single chess piece given its FEN character.
/// Uppercase = white piece, lowercase = black piece.
/// Uses Unicode chess symbols for cross-platform rendering.
struct ChessPieceView: View {
    let piece: Character

    var body: some View {
        Text(symbol)
            .font(.system(size: DesignTokens.FontSize.xxl))
            .accessibilityLabel(accessibilityDescription)
    }

    private var symbol: String {
        switch piece {
        case "K": return "\u{2654}"
        case "Q": return "\u{2655}"
        case "R": return "\u{2656}"
        case "B": return "\u{2657}"
        case "N": return "\u{2658}"
        case "P": return "\u{2659}"
        case "k": return "\u{265A}"
        case "q": return "\u{265B}"
        case "r": return "\u{265C}"
        case "b": return "\u{265D}"
        case "n": return "\u{265E}"
        case "p": return "\u{265F}"
        default: return ""
        }
    }

    private var accessibilityDescription: String {
        let color = piece.isUppercase ? "White" : "Black"
        let name: String
        switch piece.lowercased().first {
        case "k": name = "King"
        case "q": name = "Queen"
        case "r": name = "Rook"
        case "b": name = "Bishop"
        case "n": name = "Knight"
        case "p": name = "Pawn"
        default: name = "Piece"
        }
        return "\(color) \(name)"
    }
}
