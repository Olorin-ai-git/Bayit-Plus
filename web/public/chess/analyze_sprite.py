#!/usr/bin/env python3
"""
Analyze the sprite sheet to find where the pieces actually are.
"""

from PIL import Image
import numpy as np

# Load the sprite sheet
img = Image.open("Gemini_Generated_Image_iyj0h8iyj0h8iyj0.png")
width, height = img.size

print(f"Image dimensions: {width}x{height}")

# Convert to numpy array for analysis
img_array = np.array(img)

# Find rows with significant non-transparent content
# Alpha channel is the 4th channel
if img_array.shape[2] == 4:
    alpha = img_array[:, :, 3]

    # Find rows with significant alpha (non-transparent)
    row_alpha_sum = np.sum(alpha > 128, axis=1)

    print("\nAnalyzing rows with content:")
    for y in range(height):
        if row_alpha_sum[y] > width * 0.1:  # At least 10% of row has content
            if y % 50 == 0:  # Print every 50th row to avoid clutter
                print(f"Row {y}: {row_alpha_sum[y]} pixels")

    # Find the transition point where pieces section starts
    # Look for the bottom section with multiple pieces
    for y in range(height // 2, height):
        if row_alpha_sum[y] > width * 0.3:
            print(f"\nPieces section likely starts around y={y}")
            break

    # Analyze column distribution in the bottom section
    bottom_section_y = height * 2 // 3  # Start from 2/3 down
    bottom_alpha = alpha[bottom_section_y:, :]
    col_alpha_sum = np.sum(bottom_alpha > 128, axis=0)

    print(f"\nBottom section starts at y={bottom_section_y}")
    print("Analyzing columns in bottom section:")

    # Find clusters of content (pieces)
    in_piece = False
    piece_start = 0
    pieces_x = []

    for x in range(width):
        if col_alpha_sum[x] > 50 and not in_piece:
            piece_start = x
            in_piece = True
        elif col_alpha_sum[x] <= 50 and in_piece:
            piece_end = x
            pieces_x.append((piece_start, piece_end))
            in_piece = False

    print(f"\nFound {len(pieces_x)} potential piece columns:")
    for i, (start, end) in enumerate(pieces_x[:10]):  # Show first 10
        print(f"  Piece {i}: x={start} to {end}, width={end-start}")

else:
    print("Image doesn't have an alpha channel!")
