"""Test image download directly without full app initialization"""
import asyncio
import httpx
from io import BytesIO
from PIL import Image
import base64


async def test_download():
    """Test downloading Avatar image with proper headers"""
    url = "https://upload.wikimedia.org/wikipedia/en/d/d6/Avatar_%282009_film%29_poster.jpg"

    print(f"📥 Attempting to download: {url}\n")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
    }

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            print(f"✅ Download successful!")
            print(f"   Status: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('content-type')}")
            print(f"   Size: {len(response.content)} bytes")

            # Process image
            image = Image.open(BytesIO(response.content))
            print(f"   Original size: {image.size}")

            # Convert and resize
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')

            # Resize
            max_size = (800, 1200)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
                print(f"   Resized to: {image.size}")

            # Convert to base64
            buffer = BytesIO()
            image.save(buffer, format='JPEG', quality=85, optimize=True)
            buffer.seek(0)

            image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            data_uri = f"data:image/jpeg;base64,{image_data}"

            print(f"\n✅ Image processed successfully!")
            print(f"   Base64 size: {len(data_uri)} characters")
            print(f"   Preview: {data_uri[:100]}...")

            return data_uri

    except httpx.HTTPError as e:
        print(f"❌ HTTP error: {e}")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


if __name__ == "__main__":
    result = asyncio.run(test_download())
    if result:
        print(f"\n🎉 SUCCESS! Image can be downloaded and processed.")
    else:
        print(f"\n❌ FAILED to download image.")
