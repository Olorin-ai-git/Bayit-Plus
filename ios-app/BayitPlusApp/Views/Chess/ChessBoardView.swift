import BayitDesignSystem
import SwiftUI

/// 8x8 chess board grid rendered with LazyVGrid.
/// Alternating light/dark squares with piece rendering and tap-to-select/move interaction.
struct ChessBoardView: View {
    let board: [[Character?]]
    let selectedSquare: (row: Int, col: Int)?
    let currentTurn: PlayerColor
    let onSquareTap: (Int, Int) -> Void

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 8)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 0) {
            ForEach(0..<64, id: \.self) { index in
                let row = index / 8
                let col = index % 8
                squareView(row: row, col: col)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .aspectRatio(1, contentMode: .fit)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Chess board")
    }

    // MARK: - Square

    @ViewBuilder
    private func squareView(row: Int, col: Int) -> some View {
        let isLight = (row + col) % 2 == 0
        let isSelected = selectedSquare?.row == row && selectedSquare?.col == col
        let piece = board[safe: row]?[safe: col] ?? nil

        Button {
            onSquareTap(row, col)
        } label: {
            ZStack {
                squareBackground(isLight: isLight, isSelected: isSelected)

                if let piece {
                    ChessPieceView(piece: piece)
                }
            }
            .frame(maxWidth: .infinity)
            .aspectRatio(1, contentMode: .fit)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(squareAccessibilityLabel(row: row, col: col, piece: piece))
        .accessibilityAddTraits(piece != nil ? .isButton : [])
    }

    @ViewBuilder
    private func squareBackground(isLight: Bool, isSelected: Bool) -> some View {
        if isSelected {
            DesignTokens.Primary.p500.opacity(0.6)
        } else if isLight {
            Color(white: 0.88)
        } else {
            Color(white: 0.45)
        }
    }

    private func squareAccessibilityLabel(row: Int, col: Int, piece: Character?) -> String {
        let file = String(UnicodeScalar(97 + col)!)
        let rank = String(8 - row)
        let square = "\(file)\(rank)"

        if let piece {
            let color = piece.isUppercase ? "White" : "Black"
            let name = pieceName(piece)
            return "\(color) \(name) on \(square)"
        }
        return "Empty square \(square)"
    }

    private func pieceName(_ piece: Character) -> String {
        switch piece.lowercased().first {
        case "k": return "King"
        case "q": return "Queen"
        case "r": return "Rook"
        case "b": return "Bishop"
        case "n": return "Knight"
        case "p": return "Pawn"
        default: return "Piece"
        }
    }
}

// MARK: - Safe Array Access

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

private extension Array where Element == Optional<Character> {
    subscript(safe index: Int) -> Character?? {
        indices.contains(index) ? self[index] : nil
    }
}
