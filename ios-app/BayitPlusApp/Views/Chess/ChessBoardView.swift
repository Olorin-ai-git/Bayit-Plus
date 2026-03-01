import BayitDesignSystem
import SwiftUI

/// 8x8 chess board using the glass board image as background,
/// with glass piece images overlaid via a transparent tap grid.
/// The grid is inset to align with the board image's square area.
struct ChessBoardView: View {
    let board: [[Character?]]
    let selectedSquare: (row: Int, col: Int)?
    let currentTurn: PlayerColor
    let onSquareTap: (Int, Int) -> Void

    /// Percentage of the board image occupied by decorative border on each side.
    private let boardInsetRatio: CGFloat = 0.10

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 8)

    var body: some View {
        GeometryReader { geo in
            let inset = geo.size.width * boardInsetRatio

            ZStack {
                Image("chess-board")
                    .resizable()
                    .scaledToFit()

                LazyVGrid(columns: columns, spacing: 0) {
                    ForEach(0 ..< 64, id: \.self) { index in
                        let row = index / 8
                        let col = index % 8
                        squareView(row: row, col: col)
                    }
                }
                .padding(inset)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Chess board")
    }

    // MARK: - Square

    @ViewBuilder
    private func squareView(row: Int, col: Int) -> some View {
        let isSelected = selectedSquare?.row == row && selectedSquare?.col == col
        let piece = board[safe: row]?[safe: col] ?? nil

        Button {
            onSquareTap(row, col)
        } label: {
            ZStack {
                if isSelected {
                    DesignTokens.Primary.p400.opacity(0.45)
                } else {
                    Color.clear
                }

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

private extension Array where Element == Character? {
    subscript(safe index: Int) -> Character?? {
        indices.contains(index) ? self[index] : nil
    }
}
