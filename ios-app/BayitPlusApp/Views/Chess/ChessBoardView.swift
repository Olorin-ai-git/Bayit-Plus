import BayitCore
import BayitDesignSystem
import SwiftUI

/// 8x8 chess board using the glass board image as background,
/// with glass piece images overlaid. A single spatial tap gesture
/// on the whole board converts coordinates to row/col.
struct ChessBoardView: View {
    let board: [[Character?]]
    let selectedSquare: (row: Int, col: Int)?
    let currentTurn: PlayerColor
    let onSquareTap: (Int, Int) -> Void

    /// Percentage of the board image occupied by decorative border on each side.
    private let boardInsetRatio: CGFloat = 0.10

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let inset = size * boardInsetRatio
            let cellSize = (size - 2 * inset) / 8

            ZStack {
                Image("chess-board")
                    .resizable()
                    .frame(width: size, height: size)

                VStack(spacing: 0) {
                    ForEach(0 ..< 8, id: \.self) { row in
                        HStack(spacing: 0) {
                            ForEach(0 ..< 8, id: \.self) { col in
                                squareDisplay(row: row, col: col, size: cellSize)
                            }
                        }
                    }
                }
                .padding(inset)
            }
            .frame(width: size, height: size)
            .contentShape(Rectangle())
            .simultaneousGesture(
                SpatialTapGesture()
                    .onEnded { value in
                        let x = value.location.x - inset
                        let y = value.location.y - inset
                        let col = Int(x / cellSize)
                        let row = Int(y / cellSize)
                        let file = col >= 0 && col < 8 ? String(UnicodeScalar(97 + col)!) : "?"
                        let rank = row >= 0 && row < 8 ? String(8 - row) : "?"
                        BayitLogger(category: "ChessBoard").info(
                            "Tap",
                            context: [
                                "raw": "\(value.location.x),\(value.location.y)",
                                "adj": "\(x),\(y)",
                                "cell": "\(cellSize)",
                                "square": "\(file)\(rank)",
                                "row": "\(row)",
                                "col": "\(col)",
                            ]
                        )
                        guard row >= 0, row < 8, col >= 0, col < 8 else { return }
                        onSquareTap(row, col)
                    }
            )
        }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Chess board")
    }

    // MARK: - Square Display

    private func squareDisplay(row: Int, col: Int, size: CGFloat) -> some View {
        let isSelected = selectedSquare?.row == row && selectedSquare?.col == col
        let piece = board[safe: row]?[safe: col] ?? nil

        return ZStack {
            if isSelected {
                DesignTokens.Primary.p400.opacity(0.45)
            }

            if let piece {
                ChessPieceView(piece: piece)
                    .scaleEffect(pieceScale(piece))
            }
        }
        .frame(width: size, height: size)
    }

    // MARK: - Piece Scale

    private func pieceScale(_ piece: Character) -> CGFloat {
        switch piece.lowercased() {
        case "k", "q": return 1.35
        case "r": return 1.2
        case "b", "n": return 1.1
        default: return 0.85
        }
    }

    // MARK: - Accessibility

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
