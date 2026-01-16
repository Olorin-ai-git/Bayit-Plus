#!/usr/bin/env python3
"""
Find the correct Y position for the pieces by creating sample crops.
"""

from PIL import Image
import os

# Load the sprite sheet
img = Image.open("Gemini_Generated_Image_iyj0h8iyj0h8iyj0.png")
width, height = img.size

print(f"Image dimensions: {width}x{height}")

# Create a test directory
os.makedirs("test_crops", exist_ok=True)

# Try different Y positions to find where pieces are
# The image is 1024x1024, so let's try from y=500 to y=900 in steps of 50
test_y_positions = range(500, 950, 50)

for y in test_y_positions:
    # Crop a horizontal strip
    strip = img.crop((0, y, width, y + 100))
    strip.save(f"test_crops/strip_y{y}.png")
    print(f"Created strip at y={y}")

# Also try extracting pieces at different positions
# Assuming pieces are roughly 60x80 and centered
piece_width = 80
piece_height = 100

# Try different starting Y positions
for y in [600, 650, 700, 750, 800]:
    # Try to extract first piece
    start_x = width // 4  # Guess at starting X
    piece = img.crop((start_x, y, start_x + piece_width, y + piece_height))
    piece.save(f"test_crops/piece_y{y}.png")
    print(f"Created test piece at y={y}")

print("\nCheck test_crops/ directory to find the correct Y position")
