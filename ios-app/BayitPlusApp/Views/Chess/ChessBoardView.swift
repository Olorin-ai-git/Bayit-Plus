import BayitDesignSystem
import SwiftUI

/// 8x8 chess board with glass board background, piece overlays,
/// subtle 3D perspective, and smooth move animations.
struct ChessBoardView: View {
    let board: [[Character?]]
    let selectedSquare: (row: Int, col: Int)?
    let lastMove: (from: (row: Int, col: Int), to: (row: Int, col: Int))?
    let currentTurn: PlayerColor
    let isFlipped: Bool
    let onSquareTap: (Int, Int) -> Void

    /// Percentage of the board image occupied by decorative border.
    private let boardInsetRatio: CGFloat = 0.10
    /// Subtle forward tilt angle in degrees.
    private let perspectiveTiltDegrees: Double = 8
    /// Vertical offset to compensate for perspective shift.
    private let perspectiveOffsetRatio: CGFloat = 0.02

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
                    ForEach(0 ..< 8, id: \.self) { visualRow in
                        HStack(spacing: 0) {
                            ForEach(0 ..< 8, id: \.self) { visualCol in
                                let dataRow = isFlipped ? (7 - visualRow) : visualRow
                                let dataCol = isFlipped ? (7 - visualCol) : visualCol
                                squareCell(row: dataRow, col: dataCol, size: cellSize)
                            }
                        }
                    }
                }
                .padding(inset)
                .animation(.spring(duration: 0.5, bounce: 0.15), value: board.flatMap { $0.map { $0.map(String.init) ?? "" } })
            }
            .frame(width: size, height: size)
            .contentShape(Rectangle())
            .simultaneousGesture(
                SpatialTapGesture()
                    .onEnded { value in
                        let x = value.location.x - inset
                        let y = value.location.y - inset
                        let visualCol = Int(x / cellSize)
                        let visualRow = Int(y / cellSize)
                        guard visualRow >= 0, visualRow < 8, visualCol >= 0, visualCol < 8 else { return }
                        let dataRow = isFlipped ? (7 - visualRow) : visualRow
                        let dataCol = isFlipped ? (7 - visualCol) : visualCol
                        onSquareTap(dataRow, dataCol)
                    }
            )
        }
        .aspectRatio(1, contentMode: .fit)
        .rotation3DEffect(
            .degrees(perspectiveTiltDegrees),
            axis: (x: 1, y: 0, z: 0),
            perspective: 0.3
        )
        .offset(y: -UIScreen.main.bounds.width * perspectiveOffsetRatio)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Chess board")
    }

    // MARK: - Square Cell

    private func squareCell(row: Int, col: Int, size: CGFloat) -> some View {
        let isSelected = selectedSquare?.row == row && selectedSquare?.col == col
        let isLastMoveSquare = isPartOfLastMove(row: row, col: col)
        let piece = board[safe: row]?[safe: col] ?? nil

        return ZStack {
            if isSelected {
                DesignTokens.Primary.p400.opacity(0.45)
            } else if isLastMoveSquare {
                DesignTokens.Primary.p400.opacity(0.2)
            }

            if let piece {
                ChessPieceView(piece: piece)
                    .scaleEffect(pieceScale(piece))
                    .offset(y: pieceYOffset(piece, cellSize: size))
                    .transition(.opacity.combined(with: .scale(scale: 0.6)))
            }
        }
        .frame(width: size, height: size)
    }

    // MARK: - Last Move Highlight

    private func isPartOfLastMove(row: Int, col: Int) -> Bool {
        guard let move = lastMove else { return false }
        return (move.from.row == row && move.from.col == col)
            || (move.to.row == row && move.to.col == col)
    }

    // MARK: - Piece Scale & Offset

    private func pieceScale(_ piece: Character) -> CGFloat {
        switch piece.lowercased() {
        case "k", "q": return 1.4
        case "r": return 1.2
        case "b", "n": return 1.15
        default: return 1.0
        }
    }

    /// Shift tall pieces upward so their base stays on the square.
    private func pieceYOffset(_ piece: Character, cellSize: CGFloat) -> CGFloat {
        switch piece.lowercased() {
        case "k", "q": return -cellSize * 0.15
        case "r": return -cellSize * 0.06
        case "b", "n": return -cellSize * 0.04
        default: return 0
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
