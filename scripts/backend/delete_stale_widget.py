"""
Delete stale widget with non-existent channel ID.

This script removes widget 6963c61087edbecb29507fbc which references
non-existent channel 6963bff4abb3ca055cdd8474.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from olorin_shared.database import init_mongodb, get_mongodb_client, get_mongodb_database
from app.models.widget import Widget
from beanie import PydanticObjectId, init_beanie


async def delete_stale_widget():
    """Delete the stale widget."""
    # Initialize database connection (reads from environment variables)
    await init_mongodb()

    # Initialize Beanie with Widget model
    client = get_mongodb_client()
    db = get_mongodb_database()
    await init_beanie(database=db, document_models=[Widget])

    widget_id = "6963c61087edbecb29507fbc"

    print(f"Looking for widget: {widget_id}")

    try:
        widget = await Widget.get(PydanticObjectId(widget_id))

        if widget:
            print(f"Found widget: {widget.title}")
            print(f"Content type: {widget.content.content_type}")
            print(f"Channel ID: {widget.content.live_channel_id}")

            # Confirm deletion
            response = input(f"\nDelete widget '{widget.title}'? (yes/no): ")
            if response.lower() == 'yes':
                await widget.delete()
                print(f"✅ Widget {widget_id} deleted successfully")
            else:
                print("Deletion cancelled")
        else:
            print(f"❌ Widget {widget_id} not found")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(delete_stale_widget())
