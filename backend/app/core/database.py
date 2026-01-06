from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

# Models
from app.models.user import User
from app.models.content import Content, Category, LiveChannel, EPGEntry, RadioStation, Podcast, PodcastEpisode
from app.models.subscription import Subscription, Invoice
from app.models.watchlist import WatchlistItem, WatchHistory, Conversation
from app.models.admin import (
    Campaign, Transaction, Refund, AuditLog,
    EmailCampaign, PushNotification, SystemSettings, SubscriptionPlan,
)


class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def connect_to_mongo():
    """Create database connection."""
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)

    # Initialize Beanie with document models
    await init_beanie(
        database=db.client[settings.MONGODB_DB_NAME],
        document_models=[
            User,
            Content,
            Category,
            LiveChannel,
            EPGEntry,
            RadioStation,
            Podcast,
            PodcastEpisode,
            Subscription,
            Invoice,
            WatchlistItem,
            WatchHistory,
            Conversation,
            # Admin models
            Campaign,
            Transaction,
            Refund,
            AuditLog,
            EmailCampaign,
            PushNotification,
            SystemSettings,
            SubscriptionPlan,
        ],
    )
    print(f"Connected to MongoDB: {settings.MONGODB_DB_NAME}")


async def close_mongo_connection():
    """Close database connection."""
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")


def get_database():
    return db.client[settings.MONGODB_DB_NAME]
