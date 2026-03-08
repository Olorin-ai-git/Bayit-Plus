"""
Outfit Service.

Manages the collectible wardrobe system: catalog, purchase, equip, and
overlay compositing via FFmpeg for mission rendering.
"""

from datetime import datetime, timezone
from typing import List, Optional

from app.core.logging_config import get_logger
from app.models.avatar_outfit import (
    AvatarOutfit,
    OutfitCatalogResponse,
    ProfileOutfitInventory,
)
from app.models.child_avatar import ChildAvatar
from app.models.shekel_currency import TransactionType
from app.services.mission.shekel_service import shekel_service

logger = get_logger(__name__)


class OutfitService:
    """Manages avatar outfit catalog, purchases, and rendering."""

    async def get_catalog(
        self,
        avatar_id: Optional[str] = None,
    ) -> List[OutfitCatalogResponse]:
        """
        Get all active outfits in the catalog.

        If avatar_id provided, marks which outfits are owned.
        """
        outfits = await AvatarOutfit.find(
            {"is_active": True}
).sort("+sort_order").to_list()

        owned_ids = set()
        if avatar_id:
            avatar = await ChildAvatar.get(avatar_id)
            if avatar:
                owned_ids = {
                    item.outfit_id
                    for item in avatar.outfit_inventory
                }

        return [
            OutfitCatalogResponse(
                id=str(o.id),
                outfit_id=o.outfit_id,
                name=o.name,
                name_he=o.name_he,
                description=o.description,
                description_he=o.description_he,
                category=o.category.value,
                rarity=o.rarity.value,
                thumbnail_url=o.thumbnail_gcs_path,
                shekel_price=o.shekel_price,
                is_purchasable=o.is_purchasable,
                is_reward_only=o.is_reward_only,
                required_mission_count=o.required_mission_count,
                owned=o.outfit_id in owned_ids,
            )
            for o in outfits
        ]

    async def purchase_outfit(
        self,
        user_id: str,
        profile_id: str,
        avatar_id: str,
        outfit_id: str,
    ) -> None:
        """
        Purchase an outfit with shekels and add to inventory.

        Validates ownership, balance, and purchase eligibility.
        """
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or avatar.user_id != user_id:
            raise ValueError("Avatar not found or unauthorized")

        outfit = await AvatarOutfit.find_one(
            {"outfit_id": outfit_id}
)
        if not outfit:
            raise ValueError(f"Outfit not found: {outfit_id}")

        if not outfit.is_purchasable or outfit.is_reward_only:
            raise ValueError("This outfit is not available for purchase")

        already_owned = any(
            item.outfit_id == outfit_id
            for item in avatar.outfit_inventory
        )
        if already_owned:
            raise ValueError("Outfit already owned")

        await shekel_service.spend_shekels(
            user_id=user_id,
            profile_id=profile_id,
            amount=outfit.shekel_price,
            transaction_type=TransactionType.OUTFIT_PURCHASE,
            description=f"Purchased outfit: {outfit.name}",
            description_he=f"רכישת תלבושת: {outfit.name_he}",
            reference_id=outfit_id,
        )

        avatar.outfit_inventory.append(
            ProfileOutfitInventory(
                outfit_id=outfit_id,
                acquisition_source="purchase",
            )
        )
        avatar.updated_at = datetime.now(timezone.utc)
        await avatar.save()

        logger.info(
            "Outfit purchased",
            extra={
                "user_id": user_id,
                "avatar_id": avatar_id,
                "outfit_id": outfit_id,
                "price": outfit.shekel_price,
            },
        )

    async def equip_outfit(
        self,
        user_id: str,
        avatar_id: str,
        outfit_id: Optional[str],
    ) -> None:
        """
        Equip an outfit on the avatar. Pass None to unequip.

        Validates ownership before equipping.
        """
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar or avatar.user_id != user_id:
            raise ValueError("Avatar not found or unauthorized")

        if outfit_id is not None:
            owned = any(
                item.outfit_id == outfit_id
                for item in avatar.outfit_inventory
            )
            if not owned:
                raise ValueError("Outfit not owned")

        avatar.active_outfit_id = outfit_id
        avatar.updated_at = datetime.now(timezone.utc)
        await avatar.save()

        logger.info(
            "Outfit equipped",
            extra={
                "avatar_id": avatar_id,
                "outfit_id": outfit_id,
            },
        )

    async def grant_outfit_reward(
        self,
        avatar_id: str,
        outfit_id: str,
    ) -> None:
        """Grant an outfit as a mission reward."""
        avatar = await ChildAvatar.get(avatar_id)
        if not avatar:
            raise ValueError(f"Avatar not found: {avatar_id}")

        already_owned = any(
            item.outfit_id == outfit_id
            for item in avatar.outfit_inventory
        )
        if already_owned:
            return

        avatar.outfit_inventory.append(
            ProfileOutfitInventory(
                outfit_id=outfit_id,
                acquisition_source="mission_reward",
            )
        )
        avatar.updated_at = datetime.now(timezone.utc)
        await avatar.save()

        logger.info(
            "Outfit reward granted",
            extra={
                "avatar_id": avatar_id,
                "outfit_id": outfit_id,
            },
        )


outfit_service = OutfitService()
