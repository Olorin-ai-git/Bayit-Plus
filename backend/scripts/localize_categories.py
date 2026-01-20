#!/usr/bin/env python3
"""
Script to add English and Spanish translations to existing categories.
This ensures categories display properly in all languages.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo
from app.models.content import 
from app.models.content_taxonomy import ContentSection


# Category translations mapping
CATEGORY_TRANSLATIONS = {
    # Hebrew name -> (English, Spanish)
    "סרטים ישראליים": ("Israeli Movies", "Películas Israelíes"),
    "דרמה": ("Drama", "Drama"),
    "קומדיה": ("Comedy", "Comedia"),
    "דוקומנטרי": ("Documentary", "Documental"),
    "ילדים ומשפחה": ("Kids & Family", "Niños y Familia"),
    "חדשות ואקטואליה": ("News & Current Affairs", "Noticias y Actualidad"),
    "סדרות": ("Series", "Series"),
    "Movies": ("Movies", "Películas"),
    "Drama": ("Drama", "Drama"),
    "Comedy": ("Comedy", "Comedia"),
    "Documentary": ("Documentary", "Documental"),
    "Kids": ("Kids", "Niños"),
    "Action": ("Action", "Acción"),
    "Thriller": ("Thriller", "Suspenso"),
    "Horror": ("Horror", "Terror"),
    "Romance": ("Romance", "Romance"),
    "Sci-Fi": ("Sci-Fi", "Ciencia Ficción"),
    "Fantasy": ("Fantasy", "Fantasía"),
    "Animation": ("Animation", "Animación"),
    "Adventure": ("Adventure", "Aventura"),
    "Crime": ("Crime", "Crimen"),
    "Mystery": ("Mystery", "Misterio"),
    "War": ("War", "Guerra"),
    "History": ("History", "Historia"),
    "Music": ("Music", "Música"),
    "Sport": ("Sport", "Deportes"),
    "Biography": ("Biography", "Biografía"),
    "Family": ("Family", "Familia"),
    "Western": ("Western", "Western"),
}


async def localize_categories():
    """Add English and Spanish translations to all categories."""
    print("🌍 Starting category localization...")
    
    # Initialize database
    await connect_to_mongo()
    
    # Get all categories
    categories = await Category.find_all().to_list()
    print(f"📊 Found {len(categories)} categories")
    
    updated_count = 0
    skipped_count = 0
    
    for category in categories:
        # Skip if already has translations
        if category.name_en and category.name_es:
            print(f"⏭️  Skipping '{category.name}' - already has translations")
            skipped_count += 1
            continue
        
        # Look up translations
        translations = CATEGORY_TRANSLATIONS.get(category.name)
        
        if translations:
            name_en, name_es = translations
            category.name_en = name_en
            category.name_es = name_es
            await category.save()
            print(f"✅ Updated '{category.name}' -> EN: '{name_en}', ES: '{name_es}'")
            updated_count += 1
        else:
            # If no translation found, use the original name as fallback
            if not category.name_en:
                category.name_en = category.name
            if not category.name_es:
                category.name_es = category.name
            await category.save()
            print(f"⚠️  No translation for '{category.name}' - using original as fallback")
            updated_count += 1
    
    print(f"\n✅ Localization complete!")
    print(f"   Updated: {updated_count}")
    print(f"   Skipped: {skipped_count}")
    print(f"   Total: {len(categories)}")


if __name__ == "__main__":
    asyncio.run(localize_categories())
