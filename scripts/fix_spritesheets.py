#!/usr/bin/env python3
"""
Spritesheet Alignment Tool
Fixes inconsistent character positioning across spritesheet frames by:
1. Extracting each frame
2. Finding the bounding box of non-transparent content
3. Centering the content consistently across all frames
4. Recombining into an aligned spritesheet
"""

import os
import json
from pathlib import Path
from PIL import Image
import argparse


def get_content_bbox(image: Image.Image, threshold: int = 10) -> tuple[int, int, int, int]:
    """
    Find the bounding box of non-transparent content in an RGBA image.
    Returns (left, top, right, bottom) or None if image is empty.
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Get alpha channel
    alpha = image.split()[3]

    # Find bounding box of non-transparent pixels
    bbox = alpha.getbbox()

    if bbox is None:
        # Image is fully transparent
        return (0, 0, image.width, image.height)

    return bbox


def extract_frames(spritesheet: Image.Image, frame_width: int, frame_height: int,
                   columns: int, rows: int, total_frames: int) -> list[Image.Image]:
    """Extract individual frames from a spritesheet."""
    frames = []

    for i in range(total_frames):
        col = i % columns
        row = i // columns

        left = col * frame_width
        top = row * frame_height
        right = left + frame_width
        bottom = top + frame_height

        frame = spritesheet.crop((left, top, right, bottom))
        frames.append(frame)

    return frames


def center_frame(frame: Image.Image, target_width: int, target_height: int,
                 center_x: int, center_y: int) -> Image.Image:
    """
    Center the content of a frame at a specific position.
    """
    bbox = get_content_bbox(frame)
    if bbox is None:
        return frame

    left, top, right, bottom = bbox
    content_width = right - left
    content_height = bottom - top

    # Calculate current content center
    content_center_x = left + content_width // 2
    content_center_y = top + content_height // 2

    # Calculate offset needed to move content to target center
    offset_x = center_x - content_center_x
    offset_y = center_y - content_center_y

    # Create new frame with content repositioned
    new_frame = Image.new('RGBA', (target_width, target_height), (0, 0, 0, 0))

    # Paste content at new position
    paste_x = offset_x
    paste_y = offset_y

    new_frame.paste(frame, (paste_x, paste_y), frame)

    return new_frame


def align_spritesheet(spritesheet_path: str, config: dict, output_path: str = None) -> str:
    """
    Align all frames in a spritesheet to have consistent positioning.
    """
    print(f"Processing: {spritesheet_path}")

    # Load spritesheet
    spritesheet = Image.open(spritesheet_path)
    if spritesheet.mode != 'RGBA':
        spritesheet = spritesheet.convert('RGBA')

    frame_width = config['frameWidth']
    frame_height = config['frameHeight']
    columns = config['columns']
    rows = config['rows']
    total_frames = config['totalFrames']

    print(f"  Frame size: {frame_width}x{frame_height}")
    print(f"  Grid: {columns}x{rows}, Total frames: {total_frames}")

    # Extract frames
    frames = extract_frames(spritesheet, frame_width, frame_height, columns, rows, total_frames)
    print(f"  Extracted {len(frames)} frames")

    # Analyze all frames to find consistent center point
    bboxes = []
    valid_bboxes = []  # Only frames with substantial content
    for i, frame in enumerate(frames):
        bbox = get_content_bbox(frame)
        bboxes.append(bbox)
        left, top, right, bottom = bbox
        content_height = bottom - top
        content_width = right - left
        print(f"  Frame {i}: bbox=({left}, {top}, {right}, {bottom}), size=({content_width}x{content_height})")

        # Only include frames with substantial content (at least 50% of frame height)
        if content_height > frame_height * 0.5:
            valid_bboxes.append(bbox)

    if not valid_bboxes:
        valid_bboxes = bboxes  # Fallback to all if none are valid

    # Find the maximum content dimensions from valid frames only
    max_content_width = max(bbox[2] - bbox[0] for bbox in valid_bboxes)
    max_content_height = max(bbox[3] - bbox[1] for bbox in valid_bboxes)

    # Calculate average center point from valid frames only
    avg_center_x = sum((bbox[0] + bbox[2]) // 2 for bbox in valid_bboxes) // len(valid_bboxes)
    avg_center_y = sum((bbox[1] + bbox[3]) // 2 for bbox in valid_bboxes) // len(valid_bboxes)

    print(f"  Valid frames for alignment: {len(valid_bboxes)}/{len(bboxes)}")
    print(f"  Max content size: {max_content_width}x{max_content_height}")
    print(f"  Average center: ({avg_center_x}, {avg_center_y})")

    # Target center (middle of frame)
    target_center_x = frame_width // 2
    target_center_y = frame_height // 2

    print(f"  Target center: ({target_center_x}, {target_center_y})")

    # Align each frame using the consistent target center
    aligned_frames = []
    for i, frame in enumerate(frames):
        aligned = center_frame(frame, frame_width, frame_height, target_center_x, target_center_y)
        aligned_frames.append(aligned)

    print(f"  Aligned {len(aligned_frames)} frames")

    # Recombine into spritesheet
    new_spritesheet = Image.new('RGBA', (columns * frame_width, rows * frame_height), (0, 0, 0, 0))

    for i, frame in enumerate(aligned_frames):
        col = i % columns
        row = i // columns

        left = col * frame_width
        top = row * frame_height

        new_spritesheet.paste(frame, (left, top))

    # Save output
    if output_path is None:
        output_path = spritesheet_path.replace('.png', '_aligned.png')

    new_spritesheet.save(output_path, 'PNG')
    print(f"  Saved aligned spritesheet to: {output_path}")

    return output_path


def process_spritesheet_directory(directory: str, backup: bool = True):
    """
    Process a spritesheet directory containing spritesheet.png and config.json
    """
    dir_path = Path(directory)
    spritesheet_path = dir_path / 'spritesheet.png'
    config_path = dir_path / 'config.json'

    if not spritesheet_path.exists():
        print(f"Error: No spritesheet.png found in {directory}")
        return

    if not config_path.exists():
        print(f"Error: No config.json found in {directory}")
        return

    # Load config
    with open(config_path, 'r') as f:
        config = json.load(f)

    # Backup original if requested
    if backup:
        backup_path = dir_path / 'spritesheet_original.png'
        if not backup_path.exists():
            import shutil
            shutil.copy(spritesheet_path, backup_path)
            print(f"  Backed up original to: {backup_path}")

    # Process spritesheet (overwrite original)
    align_spritesheet(str(spritesheet_path), config, str(spritesheet_path))


def main():
    parser = argparse.ArgumentParser(description='Fix spritesheet alignment')
    parser.add_argument('path', nargs='?', help='Path to spritesheet directory or specific PNG file')
    parser.add_argument('--all', action='store_true', help='Process all spritesheets in wizard directory')
    parser.add_argument('--no-backup', action='store_true', help='Do not backup original files')

    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent / 'shared/assets/images/characters/wizard/spritesheets'

    if args.all:
        # Process all spritesheets
        for subdir in base_dir.iterdir():
            if subdir.is_dir() and (subdir / 'spritesheet.png').exists():
                process_spritesheet_directory(str(subdir), backup=not args.no_backup)
    elif args.path:
        path = Path(args.path)
        if path.is_dir():
            process_spritesheet_directory(str(path), backup=not args.no_backup)
        elif path.suffix == '.png':
            # Need config for PNG file
            config_path = path.parent / 'config.json'
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config = json.load(f)
                align_spritesheet(str(path), config)
            else:
                print(f"Error: No config.json found for {path}")
    else:
        # Default: process speaking spritesheet
        speaking_dir = base_dir / 'speaking'
        if speaking_dir.exists():
            process_spritesheet_directory(str(speaking_dir), backup=not args.no_backup)
        else:
            print(f"Error: Speaking spritesheet directory not found at {speaking_dir}")
            print("Usage: python fix_spritesheets.py [path] [--all]")


if __name__ == '__main__':
    main()
