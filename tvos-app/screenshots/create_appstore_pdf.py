#!/usr/bin/env python3
"""
Create annotated PDF for App Store Connect attachment
Bayit+ tvOS App Review Documentation
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Screenshot files to use
screenshots = [
    {
        'file': 'final-complete-20260128-214200.png',
        'title': 'Home Screen with Hero Content',
        'annotations': [
            {'text': 'Focus Navigation', 'x': 100, 'y': 50, 'arrow_to': (100, 14)},
            {'text': 'Live TV Channels\n(11, 12, 13, 14, 24)', 'x': 50, 'y': 600, 'arrow_to': (50, 310)},
            {'text': 'Hero Content\n"25th Hour" (2002)', 'x': 400, 'y': 200, 'arrow_to': (300, 140)},
            {'text': 'Watch Now CTA', 'x': 50, 'y': 500, 'arrow_to': (53, 220)},
        ]
    },
    {
        'file': '12_home_final.png',
        'title': 'Content Library & Navigation',
        'annotations': [
            {'text': 'Main Navigation\nHome, Live TV, Movies,\nRadio, Podcasts, etc.', 'x': 300, 'y': 30, 'arrow_to': (200, 11)},
            {'text': 'Live TV Row\nChannel Numbers', 'x': 300, 'y': 400, 'arrow_to': (150, 195)},
            {'text': 'Featured Content\nCurated Selection', 'x': 50, 'y': 700, 'arrow_to': (100, 245)},
        ]
    },
]

def create_annotated_image(input_file, title, annotations, output_file):
    """Add annotations to screenshot"""
    # Open image
    img = Image.open(input_file)
    draw = ImageDraw.Draw(img)

    # Try to use system font, fallback to default
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
        text_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
    except:
        title_font = ImageFont.load_default()
        text_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # Add title banner at top
    banner_height = 80
    draw.rectangle([(0, 0), (img.width, banner_height)], fill=(30, 64, 175, 220))

    # Draw title text
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (img.width - title_width) // 2
    draw.text((title_x, 15), title, fill='white', font=title_font)

    # Add annotations
    for ann in annotations:
        text = ann['text']
        x, y = ann['x'], ann['y']
        arrow_to = ann.get('arrow_to')

        # Draw callout box
        text_bbox = draw.textbbox((0, 0), text, font=text_font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]

        padding = 15
        box_x1 = x
        box_y1 = y
        box_x2 = x + text_width + (padding * 2)
        box_y2 = y + text_height + (padding * 2)

        # Semi-transparent white background
        draw.rectangle([(box_x1, box_y1), (box_x2, box_y2)],
                      fill=(255, 255, 255, 230),
                      outline=(30, 64, 175), width=3)

        # Draw text
        draw.text((x + padding, y + padding), text, fill=(0, 0, 0), font=text_font)

        # Draw arrow if specified
        if arrow_to:
            arrow_x, arrow_y = arrow_to
            # Line from box to target
            draw.line([(x + text_width//2, box_y2), (arrow_x, arrow_y)],
                     fill=(255, 200, 0), width=4)
            # Arrowhead
            draw.ellipse([(arrow_x-8, arrow_y-8), (arrow_x+8, arrow_y+8)],
                        fill=(255, 200, 0))

    # Add footer with app info
    footer_height = 60
    footer_y = img.height - footer_height
    draw.rectangle([(0, footer_y), (img.width, img.height)], fill=(0, 0, 0, 200))
    footer_text = "Bayit+ for Apple TV | Bundle ID: tv.bayit.plus.tv | Version 1.0"
    footer_bbox = draw.textbbox((0, 0), footer_text, font=small_font)
    footer_width = footer_bbox[2] - footer_bbox[0]
    footer_x = (img.width - footer_width) // 2
    draw.text((footer_x, footer_y + 20), footer_text, fill='white', font=small_font)

    # Save
    img.save(output_file)
    print(f"Created: {output_file}")

def create_cover_page(output_file):
    """Create a cover page for the PDF"""
    # Create blank image
    width, height = 1920, 1080
    img = Image.new('RGB', (width, height), color=(30, 64, 175))
    draw = ImageDraw.Draw(img)

    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 96)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
        text_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        text_font = ImageFont.load_default()

    # Title
    title = "Bayit+"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(((width - title_width) // 2, 200), title, fill='white', font=title_font)

    # Subtitle
    subtitle = "Apple TV App Review Documentation"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    draw.text(((width - subtitle_width) // 2, 320), subtitle, fill='white', font=subtitle_font)

    # Info
    info_lines = [
        "",
        "Bundle ID: tv.bayit.plus.tv",
        "Version: 1.0 (Build 1)",
        "Date: February 4, 2026",
        "",
        "Key Features Demonstrated:",
        "• Focus Navigation for Siri Remote",
        "• Live TV with AI Dubbing",
        "• Smart Context Cards",
        "• Curated Content Library",
        "• Beta 500 Program (500 AI Credits)",
        "",
        "Demo Account: apple-reviewer@bayit.tv",
        "Beta 500 Credits: 500",
    ]

    y_offset = 450
    for line in info_lines:
        if line:
            line_bbox = draw.textbbox((0, 0), line, font=text_font)
            line_width = line_bbox[2] - line_bbox[0]
            draw.text(((width - line_width) // 2, y_offset), line, fill='white', font=text_font)
        y_offset += 45

    img.save(output_file)
    print(f"Created cover page: {output_file}")

def main():
    """Create annotated PDF"""
    output_dir = 'appstore_pdf_assets'
    os.makedirs(output_dir, exist_ok=True)

    # Create cover page
    cover_file = os.path.join(output_dir, '00_cover.png')
    create_cover_page(cover_file)

    # Create annotated screenshots
    annotated_files = [cover_file]

    for i, screenshot in enumerate(screenshots, 1):
        input_file = screenshot['file']
        if not os.path.exists(input_file):
            print(f"Warning: {input_file} not found, skipping")
            continue

        output_file = os.path.join(output_dir, f'{i:02d}_{os.path.basename(input_file)}')
        create_annotated_image(
            input_file,
            screenshot['title'],
            screenshot['annotations'],
            output_file
        )
        annotated_files.append(output_file)

    # Convert to PDF
    if annotated_files:
        pdf_file = 'Bayit_Plus_tvOS_App_Store_Review_Documentation.pdf'
        images = [Image.open(f).convert('RGB') for f in annotated_files]
        images[0].save(pdf_file, save_all=True, append_images=images[1:],
                      resolution=100.0, quality=95)
        print(f"\n✅ PDF Created: {pdf_file}")
        print(f"   Pages: {len(images)}")
        print(f"   Size: {os.path.getsize(pdf_file) / 1024 / 1024:.2f} MB")
        print(f"\nUpload this PDF to App Store Connect as an attachment!")
    else:
        print("No images to process")

if __name__ == '__main__':
    main()
