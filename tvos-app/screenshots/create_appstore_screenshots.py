#!/usr/bin/env python3
"""
Create App Store-ready screenshots for Bayit+ tvOS
5 screenshots at exactly 1920x1080 pixels
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

def create_screenshot(base_image_path, title, subtitle, features, output_path, screenshot_num):
    """Create a polished App Store screenshot"""

    # Open and resize base image to 1920x1080
    img = Image.open(base_image_path)

    # Resize to exactly 1920x1080 (App Store requirement)
    img = img.resize((1920, 1080), Image.Resampling.LANCZOS)

    # Create drawing context
    draw = ImageDraw.Draw(img)

    # Load fonts
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 72)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 42)
        feature_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        number_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 140)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        feature_font = ImageFont.load_default()
        number_font = ImageFont.load_default()

    # Add subtle dark gradient overlay at bottom for text
    overlay = Image.new('RGBA', (1920, 400), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    for y in range(400):
        alpha = int((y / 400) * 180)
        overlay_draw.rectangle([(0, y), (1920, y + 1)], fill=(0, 0, 0, alpha))

    img.paste(overlay, (0, 680), overlay)
    draw = ImageDraw.Draw(img)

    # Draw screenshot number in top-right corner
    number_text = f"{screenshot_num}/5"
    number_bbox = draw.textbbox((0, 0), number_text, font=feature_font)
    number_width = number_bbox[2] - number_bbox[0]
    draw.text((1920 - number_width - 40, 40), number_text,
             fill=(255, 255, 255, 200), font=feature_font)

    # Draw title
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (1920 - title_width) // 2

    # Title with shadow
    draw.text((title_x + 3, 753), title, fill=(0, 0, 0), font=title_font)
    draw.text((title_x, 750), title, fill='white', font=title_font)

    # Draw subtitle
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (1920 - subtitle_width) // 2

    # Subtitle with shadow
    draw.text((subtitle_x + 2, 832), subtitle, fill=(0, 0, 0), font=subtitle_font)
    draw.text((subtitle_x, 830), subtitle, fill=(200, 200, 200), font=subtitle_font)

    # Draw features (if provided)
    if features:
        feature_y = 900
        for feature in features:
            # Feature bullet with shadow
            draw.text((62, feature_y + 2), "•", fill=(0, 0, 0), font=feature_font)
            draw.text((60, feature_y), "•", fill=(30, 200, 255), font=feature_font)

            # Feature text with shadow
            draw.text((102, feature_y + 2), feature, fill=(0, 0, 0), font=feature_font)
            draw.text((100, feature_y), feature, fill='white', font=feature_font)
            feature_y += 50

    # Save
    img = img.convert('RGB')
    img.save(output_path, 'PNG', quality=100, optimize=True)
    print(f"✅ Created: {output_path}")

def main():
    """Create all 5 App Store screenshots"""

    # Output directory
    output_dir = 'appstore_screenshots_1920x1080'
    os.makedirs(output_dir, exist_ok=True)

    # Screenshot 1: Home Screen with Hero Content
    if os.path.exists('final-complete-20260128-214200.png'):
        create_screenshot(
            'final-complete-20260128-214200.png',
            'Watch Israeli TV. In Your Language.',
            'Real-time AI dubbing for live broadcasts',
            [
                'Live TV: Channels 11, 12, 13, 14, 24',
                'AI Dubbing in 10 languages',
                'Smart cultural context cards'
            ],
            os.path.join(output_dir, '01_home_hero.png'),
            1
        )

    # Screenshot 2: Live TV & Channels
    if os.path.exists('12_home_final.png'):
        create_screenshot(
            '12_home_final.png',
            'Your Gateway to Israeli Culture',
            'Curated content library with AI enhancements',
            [
                'Movies, Series, and Exclusive Content',
                'Israeli Radio Stations 24/7',
                'Podcasts with Hebrew transcripts'
            ],
            os.path.join(output_dir, '02_content_library.png'),
            2
        )

    # Screenshot 3: Focus Navigation (use same as 1 with different text)
    if os.path.exists('final-complete-20260128-214200.png'):
        create_screenshot(
            'final-complete-20260128-214200.png',
            'Optimized for Apple TV',
            'Seamless 10-foot UI experience',
            [
                'Focus navigation for Siri Remote',
                '4K HDR streaming support',
                'Picture-in-Picture mode'
            ],
            os.path.join(output_dir, '03_apple_tv_optimized.png'),
            3
        )

    # Screenshot 4: Beta 500 Program
    if os.path.exists('final-complete-20260128-214200.png'):
        create_screenshot(
            'final-complete-20260128-214200.png',
            'Join Beta 500 Program',
            '500 free AI credits to explore all features',
            [
                'Real-time dubbing & translation',
                'AI search and recommendations',
                'Automatic catch-up summaries'
            ],
            os.path.join(output_dir, '04_beta_500.png'),
            4
        )

    # Screenshot 5: Multilingual Support
    if os.path.exists('12_home_final.png'):
        create_screenshot(
            '12_home_final.png',
            'Speak Your Language',
            'Interface available in 10 languages',
            [
                'Hebrew • English • Spanish • French',
                'Italian • Chinese • Hindi • Tamil',
                'Bengali • Japanese'
            ],
            os.path.join(output_dir, '05_multilingual.png'),
            5
        )

    print("\n" + "="*60)
    print("✅ ALL 5 APP STORE SCREENSHOTS CREATED!")
    print("="*60)
    print(f"Location: {output_dir}/")
    print("Resolution: 1920x1080 (App Store requirement)")
    print("\nReady to upload to App Store Connect!")
    print("="*60)

if __name__ == '__main__':
    main()
