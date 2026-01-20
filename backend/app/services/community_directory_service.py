"""
Community Directory Service - Manages Jewish community resources directory.

Provides:
- Search for synagogues, JCCs, kosher restaurants, mikvaot, etc.
- Filter by region, denomination, organization type
- Geolocation-based proximity search
- Community events discovery
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.models.jewish_community import (
    CommunityEvent,
    CommunitySearchResponse,
    Denomination,
    EventResponse,
    GeoLocation,
    JewishOrganization,
    KosherCertification,
    OrganizationResponse,
    OrganizationType,
    RegionInfo,
    RegionsResponse,
    USRegion,
)

logger = logging.getLogger(__name__)


# Region display names and metadata
REGION_METADATA: Dict[str, Dict[str, Any]] = {
    "nyc": {"name": "New York City", "name_he": "ניו יורק", "state": "NY"},
    "la": {"name": "Los Angeles", "name_he": "לוס אנג'לס", "state": "CA"},
    "chicago": {"name": "Chicago", "name_he": "שיקגו", "state": "IL"},
    "miami": {"name": "Miami", "name_he": "מיאמי", "state": "FL"},
    "boston": {"name": "Boston", "name_he": "בוסטון", "state": "MA"},
    "philadelphia": {"name": "Philadelphia", "name_he": "פילדלפיה", "state": "PA"},
    "atlanta": {"name": "Atlanta", "name_he": "אטלנטה", "state": "GA"},
    "dallas": {"name": "Dallas", "name_he": "דאלאס", "state": "TX"},
    "denver": {"name": "Denver", "name_he": "דנבר", "state": "CO"},
    "seattle": {"name": "Seattle", "name_he": "סיאטל", "state": "WA"},
    "baltimore": {"name": "Baltimore", "name_he": "בולטימור", "state": "MD"},
    "cleveland": {"name": "Cleveland", "name_he": "קליבלנד", "state": "OH"},
    "detroit": {"name": "Detroit", "name_he": "דטרויט", "state": "MI"},
}


class CommunityDirectoryService:
    """Service for managing Jewish community directory."""

    async def get_regions(self) -> RegionsResponse:
        """Get list of supported US regions with organization counts."""
        regions = []

        for region_id, meta in REGION_METADATA.items():
            count = await JewishOrganization.find(
                {"region": region_id, "is_active": True}
            ).count()

            regions.append(
                RegionInfo(
                    id=region_id,
                    name=meta["name"],
                    name_he=meta.get("name_he"),
                    state=meta["state"],
                    organization_count=count,
                )
            )

        return RegionsResponse(regions=regions)

    async def search_organizations(
        self,
        organization_type: Optional[OrganizationType] = None,
        region: Optional[str] = None,
        denomination: Optional[Denomination] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        kosher_certification: Optional[KosherCertification] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_miles: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> CommunitySearchResponse:
        """
        Search for Jewish organizations with various filters.

        Supports both region-based and geolocation-based searches.
        """
        query: Dict[str, Any] = {"is_active": True}

        if organization_type:
            query["organization_type"] = organization_type.value

        if region:
            query["region"] = region

        if denomination:
            query["denomination"] = denomination.value

        if city:
            query["city"] = {"$regex": city, "$options": "i"}

        if state:
            query["state"] = state.upper()

        if kosher_certification:
            query["kosher_certification"] = kosher_certification.value

        # Geolocation query
        if latitude is not None and longitude is not None:
            radius = radius_miles or settings.COMMUNITY_SEARCH_RADIUS_MILES
            # Convert miles to meters (MongoDB uses meters for geospatial)
            radius_meters = radius * 1609.34

            query["location"] = {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [longitude, latitude],
                    },
                    "$maxDistance": radius_meters,
                }
            }

        # Execute query with pagination
        skip = (page - 1) * limit

        organizations = (
            await JewishOrganization.find(query).skip(skip).limit(limit).to_list()
        )

        total = await JewishOrganization.find(query).count()

        # Convert to response models
        response_orgs = []
        for org in organizations:
            # Calculate distance if geolocation search
            distance = None
            if latitude is not None and longitude is not None and org.location:
                distance = self._calculate_distance(
                    latitude,
                    longitude,
                    org.location.coordinates[1],  # lat
                    org.location.coordinates[0],  # lon
                )

            response_orgs.append(
                OrganizationResponse(
                    id=str(org.id),
                    name=org.name,
                    name_he=org.name_he,
                    organization_type=org.organization_type.value,
                    denomination=org.denomination.value if org.denomination else None,
                    address=org.address,
                    city=org.city,
                    state=org.state,
                    zip_code=org.zip_code,
                    region=org.region.value if org.region else None,
                    phone=org.phone,
                    email=org.email,
                    website=org.website,
                    hours=org.hours,
                    services=org.services,
                    kosher_certification=(
                        org.kosher_certification.value
                        if org.kosher_certification
                        else None
                    ),
                    cuisine_type=org.cuisine_type,
                    price_range=org.price_range,
                    description=org.description,
                    rabbi_name=org.rabbi_name,
                    logo_url=org.logo_url,
                    is_verified=org.is_verified,
                    distance_miles=distance,
                )
            )

        return CommunitySearchResponse(
            organizations=response_orgs,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            region=region,
            total_count=total,
        )

    async def get_synagogues(
        self,
        region: Optional[str] = None,
        denomination: Optional[Denomination] = None,
        page: int = 1,
        limit: int = 20,
    ) -> CommunitySearchResponse:
        """Get synagogues, optionally filtered by region and denomination."""
        return await self.search_organizations(
            organization_type=OrganizationType.SYNAGOGUE,
            region=region,
            denomination=denomination,
            page=page,
            limit=limit,
        )

    async def get_kosher_restaurants(
        self,
        region: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        kosher_certification: Optional[KosherCertification] = None,
        page: int = 1,
        limit: int = 20,
    ) -> CommunitySearchResponse:
        """Get kosher restaurants with optional filters."""
        return await self.search_organizations(
            organization_type=OrganizationType.RESTAURANT,
            region=region,
            city=city,
            state=state,
            kosher_certification=kosher_certification,
            page=page,
            limit=limit,
        )

    async def get_jccs(
        self,
        region: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> CommunitySearchResponse:
        """Get JCC locations."""
        return await self.search_organizations(
            organization_type=OrganizationType.JCC,
            region=region,
            page=page,
            limit=limit,
        )

    async def get_mikvaot(
        self,
        region: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> CommunitySearchResponse:
        """Get mikvah locations."""
        return await self.search_organizations(
            organization_type=OrganizationType.MIKVAH,
            region=region,
            page=page,
            limit=limit,
        )

    async def get_events(
        self,
        region: Optional[str] = None,
        event_type: Optional[str] = None,
        days: int = 14,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Get upcoming community events."""
        now = datetime.utcnow()
        end_date = now + timedelta(days=days)

        query: Dict[str, Any] = {
            "is_active": True,
            "start_time": {"$gte": now, "$lte": end_date},
        }

        if region:
            query["region"] = region

        if event_type:
            query["event_type"] = event_type

        skip = (page - 1) * limit

        events = (
            await CommunityEvent.find(query)
            .sort("+start_time")
            .skip(skip)
            .limit(limit)
            .to_list()
        )

        total = await CommunityEvent.find(query).count()

        response_events = [
            EventResponse(
                id=str(event.id),
                organization_id=event.organization_id,
                organization_name=event.organization_name,
                title=event.title,
                title_he=event.title_he,
                description=event.description,
                start_time=event.start_time,
                end_time=event.end_time,
                is_all_day=event.is_all_day,
                location=event.location,
                is_virtual=event.is_virtual,
                virtual_url=event.virtual_url,
                event_type=event.event_type,
                requires_registration=event.requires_registration,
                registration_url=event.registration_url,
                cost=event.cost,
                image_url=event.image_url,
            )
            for event in events
        ]

        return {
            "events": response_events,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            "region": region,
        }

    async def get_organization_by_id(
        self, org_id: str
    ) -> Optional[OrganizationResponse]:
        """Get a single organization by ID."""
        from bson import ObjectId

        try:
            org = await JewishOrganization.get(ObjectId(org_id))
            if not org or not org.is_active:
                return None

            return OrganizationResponse(
                id=str(org.id),
                name=org.name,
                name_he=org.name_he,
                organization_type=org.organization_type.value,
                denomination=org.denomination.value if org.denomination else None,
                address=org.address,
                city=org.city,
                state=org.state,
                zip_code=org.zip_code,
                region=org.region.value if org.region else None,
                phone=org.phone,
                email=org.email,
                website=org.website,
                hours=org.hours,
                services=org.services,
                kosher_certification=(
                    org.kosher_certification.value if org.kosher_certification else None
                ),
                cuisine_type=org.cuisine_type,
                price_range=org.price_range,
                description=org.description,
                rabbi_name=org.rabbi_name,
                logo_url=org.logo_url,
                is_verified=org.is_verified,
            )
        except Exception as e:
            logger.error(f"Error fetching organization {org_id}: {e}")
            return None

    async def seed_sample_data(self) -> Dict[str, int]:
        """
        Seed sample community data for development/testing.

        Returns count of created records.
        """
        # Check if data already exists
        existing_count = await JewishOrganization.find().count()
        if existing_count > 0:
            logger.info(f"Community data already seeded ({existing_count} records)")
            return {"organizations": 0, "events": 0, "message": "Data already exists"}

        # Sample synagogues for NYC
        sample_synagogues = [
            {
                "name": "Congregation Shearith Israel",
                "name_he": "קהילת שארית ישראל",
                "organization_type": OrganizationType.SYNAGOGUE,
                "denomination": Denomination.ORTHODOX,
                "address": "2 West 70th Street",
                "city": "New York",
                "state": "NY",
                "zip_code": "10023",
                "region": USRegion.NYC,
                "phone": "(212) 873-0300",
                "website": "https://www.shearithisrael.org",
                "services": ["shabbat", "daily_minyan", "youth"],
                "description": "The oldest Jewish congregation in the United States, founded in 1654.",
                "source": "manual",
                "is_verified": True,
                "location": GeoLocation(coordinates=(-73.9775, 40.7749)),
            },
            {
                "name": "Park East Synagogue",
                "name_he": "בית הכנסת פארק איסט",
                "organization_type": OrganizationType.SYNAGOGUE,
                "denomination": Denomination.MODERN_ORTHODOX,
                "address": "163 East 67th Street",
                "city": "New York",
                "state": "NY",
                "zip_code": "10065",
                "region": USRegion.NYC,
                "phone": "(212) 737-6900",
                "website": "https://www.parkeastsynagogue.org",
                "services": ["shabbat", "daily_minyan", "youth", "adult_education"],
                "rabbi_name": "Rabbi Arthur Schneier",
                "source": "manual",
                "is_verified": True,
                "location": GeoLocation(coordinates=(-73.9644, 40.7673)),
            },
            {
                "name": "Chabad of the Upper West Side",
                "name_he": 'חב"ד אפר ווסט סייד',
                "organization_type": OrganizationType.CHABAD,
                "denomination": Denomination.CHABAD,
                "address": "2100 Broadway",
                "city": "New York",
                "state": "NY",
                "zip_code": "10023",
                "region": USRegion.NYC,
                "phone": "(212) 864-5010",
                "website": "https://www.chabadweb.org/uws",
                "services": ["shabbat", "daily_minyan", "youth", "hebrew_school"],
                "source": "manual",
                "is_verified": True,
                "location": GeoLocation(coordinates=(-73.9785, 40.7823)),
            },
        ]

        # Sample kosher restaurants for NYC
        sample_restaurants = [
            {
                "name": "Mendy's",
                "organization_type": OrganizationType.RESTAURANT,
                "address": "61 East 34th Street",
                "city": "New York",
                "state": "NY",
                "zip_code": "10016",
                "region": USRegion.NYC,
                "phone": "(212) 576-1010",
                "website": "https://www.mendys.com",
                "kosher_certification": KosherCertification.OU,
                "cuisine_type": "Deli",
                "price_range": "$$",
                "description": "Classic New York kosher deli since 1981.",
                "source": "manual",
                "is_verified": True,
                "location": GeoLocation(coordinates=(-73.9814, 40.7479)),
            },
            {
                "name": "Jezebel Restaurant",
                "organization_type": OrganizationType.RESTAURANT,
                "address": "630 9th Avenue",
                "city": "New York",
                "state": "NY",
                "zip_code": "10036",
                "region": USRegion.NYC,
                "phone": "(212) 582-1045",
                "kosher_certification": KosherCertification.OU,
                "cuisine_type": "Southern Soul Food",
                "price_range": "$$$",
                "source": "manual",
                "is_verified": True,
                "location": GeoLocation(coordinates=(-73.9907, 40.7589)),
            },
        ]

        # Sample JCCs
        sample_jccs = [
            {
                "name": "JCC Manhattan",
                "name_he": "ג'יי סי סי מנהטן",
                "organization_type": OrganizationType.JCC,
                "address": "334 Amsterdam Avenue",
                "city": "New York",
                "state": "NY",
                "zip_code": "10023",
                "region": USRegion.NYC,
                "phone": "(646) 505-4444",
                "website": "https://www.jccmanhattan.org",
                "services": [
                    "fitness",
                    "pool",
                    "youth",
                    "adult_programs",
                    "hebrew_school",
                ],
                "description": "A thriving community center for all ages.",
                "source": "manual",
                "is_verified": True,
                "location": GeoLocation(coordinates=(-73.9790, 40.7809)),
            },
            {
                "name": "JCC of Greater Los Angeles",
                "name_he": "ג'יי סי סי לוס אנג'לס",
                "organization_type": OrganizationType.JCC,
                "address": "5870 West Olympic Boulevard",
                "city": "Los Angeles",
                "state": "CA",
                "zip_code": "90036",
                "region": USRegion.LA,
                "phone": "(323) 857-0036",
                "website": "https://www.jccla.org",
                "services": ["fitness", "pool", "youth", "adult_programs", "arts"],
                "source": "manual",
                "is_verified": True,
                "location": GeoLocation(coordinates=(-118.3606, 34.0570)),
            },
        ]

        # Create all organizations
        created_orgs = 0
        all_orgs = sample_synagogues + sample_restaurants + sample_jccs

        for org_data in all_orgs:
            org = JewishOrganization(**org_data)
            await org.insert()
            created_orgs += 1

        logger.info(f"Seeded {created_orgs} sample organizations")

        # Create sample events
        created_events = 0
        nyc_shabbaton = CommunityEvent(
            organization_id="sample",
            organization_name="JCC Manhattan",
            title="Community Shabbaton",
            title_he="שבתון קהילתי",
            description="Join us for a special Shabbat experience with dinner, services, and programming.",
            start_time=datetime.utcnow() + timedelta(days=7, hours=18),
            end_time=datetime.utcnow() + timedelta(days=8, hours=22),
            is_all_day=False,
            location="JCC Manhattan",
            is_virtual=False,
            event_type="shabbaton",
            requires_registration=True,
            registration_url="https://jccmanhattan.org/shabbaton",
            cost="$36 per person",
            region=USRegion.NYC,
            source="manual",
        )
        await nyc_shabbaton.insert()
        created_events += 1

        logger.info(f"Seeded {created_events} sample events")

        return {
            "organizations": created_orgs,
            "events": created_events,
            "message": "Sample data seeded successfully",
        }

    def _calculate_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Calculate distance in miles between two coordinates using Haversine formula."""
        from math import atan2, cos, radians, sin, sqrt

        R = 3959  # Earth's radius in miles

        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)

        a = (
            sin(delta_lat / 2) ** 2
            + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        )
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return round(R * c, 2)


# Global service instance
community_directory_service = CommunityDirectoryService()
