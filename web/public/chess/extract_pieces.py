#!/usr/bin/env python3
"""
Extract individual chess pieces from sprite sheet.
The sprite sheet contains pieces at the bottom in a grid layout.
"""

from PIL import Image
import os

# Input and output paths
sprite_path = "Gemini_Generated_Image_iyj0h8iyj0h8iyj0.png"
output_dir = "pieces"

# Load the sprite sheet
img = Image.open(sprite_path)
width, height = img.size

print(f"Sprite sheet dimensions: {width}x{height}")

# Based on visual inspection, the pieces are in the bottom section
# The layout appears to be 4 rows of 8 pieces each
# Let's define the coordinates for each piece

# Approximate coordinates (will need adjustment based on actual layout)
# The pieces section starts around y=650
pieces_start_y = 650
piece_width = 60
piece_height = 80
spacing_x = 8
spacing_y = 8

# Piece order in each row (based on standard chess piece arrangement)
# Row 1: Light pieces - King, Queen, Bishop, Knight, Rook, Bishop, Knight, Pawn
# Row 2: Light pieces - Pawn, Pawn, Pawn, Pawn, Pawn, Pawn, Pawn, Pawn
# Row 3: Dark pieces - King, Queen, Bishop, Knight, Rook, Bishop, Knight, Pawn
# Row 4: Dark pieces - Pawn, Pawn, Pawn, Pawn, Pawn, Pawn, Pawn, Pawn

# Calculate starting x position to center the pieces
total_pieces_width = 8 * piece_width + 7 * spacing_x
start_x = (width - total_pieces_width) // 2

print(f"Pieces start at x={start_x}, y={pieces_start_y}")
print(f"Piece size: {piece_width}x{piece_height}")
print(f"Spacing: {spacing_x}x{spacing_y}")

# Manual extraction based on visual inspection
# Looking at the image, I can see the pieces are arranged as:
# Row 1-2: Light/cyan pieces (white)
# Row 3-4: Dark/purple pieces (black)

# Let me extract a sample piece first to verify coordinates
# Extract first light piece (should be king or similar)
test_x = start_x
test_y = pieces_start_y
test_piece = img.crop((test_x, test_y, test_x + piece_width, test_y + piece_height))
test_piece.save(os.path.join(output_dir, "test_piece.png"))
print(f"Saved test piece from ({test_x}, {test_y})")

# Define piece types and positions based on the sprite layout
# After visual inspection, extract each piece individually
# Row 1: White pieces
# Row 2: White pieces (continuation)
# Row 3: Black pieces
# Row 4: Black pieces (continuation)

# Piece naming convention: color-type.png (e.g., white-king.png, black-pawn.png)
piece_map = [
    # Row 1 - White pieces (first row)
    ('white-king', 0, 0),
    ('white-queen', 1, 0),
    ('white-bishop', 2, 0),
    ('white-knight', 3, 0),
    ('white-rook', 4, 0),
    ('white-bishop-2', 5, 0),  # Second bishop
    ('white-knight-2', 6, 0),  # Second knight
    ('white-pawn', 7, 0),

    # Row 2 - White pieces (second row - pawns)
    ('white-pawn-1', 0, 1),
    ('white-pawn-2', 1, 1),
    ('white-pawn-3', 2, 1),
    ('white-pawn-4', 3, 1),
    ('white-pawn-5', 4, 1),
    ('white-pawn-6', 5, 1),
    ('white-pawn-7', 6, 1),
    ('white-pawn-8', 7, 1),

    # Row 3 - Black pieces (first row)
    ('black-king', 0, 2),
    ('black-queen', 1, 2),
    ('black-bishop', 2, 2),
    ('black-knight', 3, 2),
    ('black-rook', 4, 2),
    ('black-bishop-2', 5, 2),
    ('black-knight-2', 6, 2),
    ('black-pawn', 7, 2),

    # Row 4 - Black pieces (second row - pawns)
    ('black-pawn-1', 0, 3),
    ('black-pawn-2', 1, 3),
    ('black-pawn-3', 2, 3),
    ('black-pawn-4', 3, 3),
    ('black-pawn-5', 4, 3),
    ('black-pawn-6', 5, 3),
    ('black-pawn-7', 6, 3),
    ('black-pawn-8', 7, 3),
]

# Extract each piece
for piece_name, col, row in piece_map:
    x = start_x + col * (piece_width + spacing_x)
    y = pieces_start_y + row * (piece_height + spacing_y)

    piece_img = img.crop((x, y, x + piece_width, y + piece_height))
    output_path = os.path.join(output_dir, f"{piece_name}.png")
    piece_img.save(output_path)
    print(f"Extracted {piece_name} from ({x}, {y})")

print(f"\nExtracted {len(piece_map)} pieces to {output_dir}/")
print("Done!")
