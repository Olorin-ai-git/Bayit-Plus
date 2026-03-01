import BayitDesignSystem
import SwiftUI

/// Renders a single chess piece given its FEN character.
/// Uppercase = white piece, lowercase = black piece.
/// Uses glass-styled piece images from the asset catalog.
struct ChessPieceView: View {
    let piece: Character

    var body: some View {
        Image(imageName)
            .resizable()
            .scaledToFit()
            .padding(0)
            .accessibilityLabel(accessibilityDescription)
    }

    private var imageName: String {
        let color = piece.isUppercase ? "white" : "black"
        let name: String
        switch piece.lowercased() {
        case "k": name = "King"
        case "q": name = "Queen"
        case "r": name = "Rook"
        case "b": name = "Bishop"
        case "n": name = "Knight"
        case "p": name = "Pawn"
        default: name = "Pawn"
        }
        return "chess-\(name)-\(color)"
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
