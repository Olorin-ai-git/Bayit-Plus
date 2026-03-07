"""
Seed BYOC Channel Index and Provider Data

Seeds the channel_index and byoc_providers collections with initial data.
Run: cd backend && poetry run python -m app.scripts.seed_byoc_data
"""

import asyncio
import logging

from app.core.database import connect_to_mongo_subset
from app.models.byoc_channel_index import ChannelIndexEntry
from app.models.byoc_provider import BYOCProvider

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SEED_CHANNELS = [
    {"canonical_name": "CNN", "aliases": ["CNN HD", "CNN International", "CNN INT", "US: CNN", "USA: CNN HD"], "category": "news", "language": "en", "country": "US"},
    {"canonical_name": "BBC One", "aliases": ["BBC 1", "BBC ONE HD", "BBC One FHD", "UK: BBC ONE", "BBC1"], "category": "entertainment", "language": "en", "country": "GB"},
    {"canonical_name": "BBC Two", "aliases": ["BBC 2", "BBC TWO HD", "UK: BBC TWO"], "category": "entertainment", "language": "en", "country": "GB"},
    {"canonical_name": "BBC News", "aliases": ["BBC NEWS HD", "UK: BBC NEWS", "BBC World News"], "category": "news", "language": "en", "country": "GB"},
    {"canonical_name": "Sky News", "aliases": ["SKY NEWS HD", "UK: SKY NEWS"], "category": "news", "language": "en", "country": "GB"},
    {"canonical_name": "Sky Sports Main Event", "aliases": ["Sky Sports ME", "UK: SKY SPORTS MAIN EVENT"], "category": "sports", "language": "en", "country": "GB"},
    {"canonical_name": "Sky Sports Premier League", "aliases": ["Sky Sports PL", "UK: SKY SPORTS PL"], "category": "sports", "language": "en", "country": "GB"},
    {"canonical_name": "Sky Sports Football", "aliases": ["UK: SKY SPORTS FOOTBALL"], "category": "sports", "language": "en", "country": "GB"},
    {"canonical_name": "BT Sport 1", "aliases": ["BT SPORT 1 HD", "UK: BT SPORT 1", "TNT Sports 1"], "category": "sports", "language": "en", "country": "GB"},
    {"canonical_name": "ITV1", "aliases": ["ITV 1", "ITV1 HD", "UK: ITV1"], "category": "entertainment", "language": "en", "country": "GB"},
    {"canonical_name": "Channel 4", "aliases": ["CH4", "Channel 4 HD", "UK: CHANNEL 4"], "category": "entertainment", "language": "en", "country": "GB"},
    {"canonical_name": "Fox News", "aliases": ["FOX NEWS HD", "US: FOX NEWS", "Fox News Channel"], "category": "news", "language": "en", "country": "US"},
    {"canonical_name": "MSNBC", "aliases": ["MSNBC HD", "US: MSNBC"], "category": "news", "language": "en", "country": "US"},
    {"canonical_name": "ESPN", "aliases": ["ESPN HD", "US: ESPN", "ESPN1"], "category": "sports", "language": "en", "country": "US"},
    {"canonical_name": "ESPN2", "aliases": ["ESPN 2 HD", "US: ESPN2"], "category": "sports", "language": "en", "country": "US"},
    {"canonical_name": "NBC", "aliases": ["NBC HD", "US: NBC"], "category": "entertainment", "language": "en", "country": "US"},
    {"canonical_name": "ABC", "aliases": ["ABC HD", "US: ABC"], "category": "entertainment", "language": "en", "country": "US"},
    {"canonical_name": "CBS", "aliases": ["CBS HD", "US: CBS"], "category": "entertainment", "language": "en", "country": "US"},
    {"canonical_name": "HBO", "aliases": ["HBO HD", "US: HBO", "HBO East"], "category": "movies", "language": "en", "country": "US"},
    {"canonical_name": "Showtime", "aliases": ["SHOWTIME HD", "US: SHOWTIME", "SHO"], "category": "movies", "language": "en", "country": "US"},
    {"canonical_name": "Discovery Channel", "aliases": ["Discovery", "DISCOVERY HD", "US: DISCOVERY"], "category": "documentary", "language": "en", "country": "US"},
    {"canonical_name": "National Geographic", "aliases": ["Nat Geo", "NAT GEO HD", "NatGeo", "US: NAT GEO"], "category": "documentary", "language": "en", "country": "US"},
    {"canonical_name": "History Channel", "aliases": ["History", "HISTORY HD", "US: HISTORY"], "category": "documentary", "language": "en", "country": "US"},
    {"canonical_name": "Cartoon Network", "aliases": ["CN", "CARTOON NETWORK HD", "US: CARTOON NETWORK"], "category": "kids", "language": "en", "country": "US"},
    {"canonical_name": "Nickelodeon", "aliases": ["Nick", "NICKELODEON HD", "US: NICK"], "category": "kids", "language": "en", "country": "US"},
    {"canonical_name": "Disney Channel", "aliases": ["Disney", "DISNEY HD", "US: DISNEY CHANNEL"], "category": "kids", "language": "en", "country": "US"},
    {"canonical_name": "MTV", "aliases": ["MTV HD", "US: MTV"], "category": "music", "language": "en", "country": "US"},
    {"canonical_name": "beIN Sports 1", "aliases": ["BEIN SPORTS 1 HD", "beIN 1", "AR: BEIN SPORTS 1"], "category": "sports", "language": "ar", "country": "QA"},
    {"canonical_name": "beIN Sports 2", "aliases": ["BEIN SPORTS 2 HD", "beIN 2", "AR: BEIN SPORTS 2"], "category": "sports", "language": "ar", "country": "QA"},
    {"canonical_name": "beIN Sports 3", "aliases": ["BEIN SPORTS 3 HD", "beIN 3"], "category": "sports", "language": "ar", "country": "QA"},
    {"canonical_name": "Al Jazeera", "aliases": ["Al Jazeera Arabic", "AJ Arabic", "AR: AL JAZEERA"], "category": "news", "language": "ar", "country": "QA"},
    {"canonical_name": "Al Jazeera English", "aliases": ["AJE", "Al Jazeera EN"], "category": "news", "language": "en", "country": "QA"},
    {"canonical_name": "MBC 1", "aliases": ["MBC1", "AR: MBC 1"], "category": "entertainment", "language": "ar", "country": "SA"},
    {"canonical_name": "MBC 2", "aliases": ["MBC2", "AR: MBC 2"], "category": "movies", "language": "ar", "country": "SA"},
    {"canonical_name": "Kan 11", "aliases": ["KAN 11", "IL: KAN 11", "Kan Israeli"], "category": "entertainment", "language": "he", "country": "IL"},
    {"canonical_name": "Channel 12", "aliases": ["Keshet 12", "IL: CHANNEL 12", "Channel 12 Israel"], "category": "entertainment", "language": "he", "country": "IL"},
    {"canonical_name": "Channel 13", "aliases": ["Reshet 13", "IL: CHANNEL 13", "Channel 13 Israel"], "category": "entertainment", "language": "he", "country": "IL"},
    {"canonical_name": "i24NEWS", "aliases": ["i24 NEWS", "IL: I24NEWS", "i24 English"], "category": "news", "language": "en", "country": "IL"},
    {"canonical_name": "Sport 5", "aliases": ["SPORT5", "IL: SPORT 5", "Sport 5 Israel"], "category": "sports", "language": "he", "country": "IL"},
    {"canonical_name": "TVE", "aliases": ["TVE1", "La 1", "ES: TVE", "TVE HD"], "category": "entertainment", "language": "es", "country": "ES"},
    {"canonical_name": "Antena 3", "aliases": ["A3", "ES: ANTENA 3", "Antena 3 HD"], "category": "entertainment", "language": "es", "country": "ES"},
    {"canonical_name": "Telecinco", "aliases": ["Tele 5", "ES: TELECINCO"], "category": "entertainment", "language": "es", "country": "ES"},
    {"canonical_name": "Univision", "aliases": ["US: UNIVISION", "Univision HD"], "category": "entertainment", "language": "es", "country": "US"},
    {"canonical_name": "Telemundo", "aliases": ["US: TELEMUNDO", "Telemundo HD"], "category": "entertainment", "language": "es", "country": "US"},
    {"canonical_name": "TF1", "aliases": ["FR: TF1", "TF1 HD"], "category": "entertainment", "language": "fr", "country": "FR"},
    {"canonical_name": "France 2", "aliases": ["FR: FRANCE 2", "France 2 HD"], "category": "entertainment", "language": "fr", "country": "FR"},
    {"canonical_name": "Canal+", "aliases": ["Canal Plus", "FR: CANAL+", "Canal+ HD"], "category": "movies", "language": "fr", "country": "FR"},
    {"canonical_name": "ARD", "aliases": ["Das Erste", "DE: ARD", "ARD HD"], "category": "entertainment", "language": "de", "country": "DE"},
    {"canonical_name": "ZDF", "aliases": ["DE: ZDF", "ZDF HD"], "category": "entertainment", "language": "de", "country": "DE"},
    {"canonical_name": "RTL", "aliases": ["DE: RTL", "RTL HD", "RTL Television"], "category": "entertainment", "language": "de", "country": "DE"},
    {"canonical_name": "Sky Sport DE", "aliases": ["Sky Sport 1", "DE: SKY SPORT"], "category": "sports", "language": "de", "country": "DE"},
    {"canonical_name": "RAI 1", "aliases": ["Rai Uno", "IT: RAI 1", "RAI 1 HD"], "category": "entertainment", "language": "it", "country": "IT"},
    {"canonical_name": "Canale 5", "aliases": ["IT: CANALE 5", "Canale 5 HD"], "category": "entertainment", "language": "it", "country": "IT"},
    {"canonical_name": "RTP 1", "aliases": ["PT: RTP 1", "RTP1"], "category": "entertainment", "language": "pt", "country": "PT"},
    {"canonical_name": "Globo", "aliases": ["TV Globo", "BR: GLOBO", "Rede Globo"], "category": "entertainment", "language": "pt", "country": "BR"},
    {"canonical_name": "SporTV", "aliases": ["BR: SPORTV", "SporTV 1"], "category": "sports", "language": "pt", "country": "BR"},
    {"canonical_name": "Russia 1", "aliases": ["Rossiya 1", "RU: RUSSIA 1"], "category": "entertainment", "language": "ru", "country": "RU"},
    {"canonical_name": "NTV Russia", "aliases": ["NTV", "RU: NTV"], "category": "entertainment", "language": "ru", "country": "RU"},
    {"canonical_name": "Match TV", "aliases": ["RU: MATCH TV", "Match"], "category": "sports", "language": "ru", "country": "RU"},
    {"canonical_name": "TRT 1", "aliases": ["TR: TRT 1", "TRT1"], "category": "entertainment", "language": "tr", "country": "TR"},
    {"canonical_name": "Star TV", "aliases": ["TR: STAR TV", "Star"], "category": "entertainment", "language": "tr", "country": "TR"},
    {"canonical_name": "Sony Ten 1", "aliases": ["IN: SONY TEN 1", "Sony Ten"], "category": "sports", "language": "hi", "country": "IN"},
    {"canonical_name": "Star Sports 1", "aliases": ["IN: STAR SPORTS 1", "Star Sports"], "category": "sports", "language": "hi", "country": "IN"},
    {"canonical_name": "Zee TV", "aliases": ["IN: ZEE TV", "Zee"], "category": "entertainment", "language": "hi", "country": "IN"},
    {"canonical_name": "CCTV-1", "aliases": ["CN: CCTV 1", "CCTV 1"], "category": "entertainment", "language": "zh", "country": "CN"},
    {"canonical_name": "NHK", "aliases": ["JP: NHK", "NHK World"], "category": "entertainment", "language": "ja", "country": "JP"},
]

SEED_PROVIDERS = [
    {
        "name": "Crystal IPTV",
        "slug": "crystal-iptv",
        "connection_types": ["xtream", "m3u"],
        "server_url": "http://crystal-iptv.com:8080",
        "sort_order": 0,
    },
    {
        "name": "Necro IPTV",
        "slug": "necro-iptv",
        "connection_types": ["xtream", "m3u"],
        "sort_order": 1,
    },
    {
        "name": "Beast TV",
        "slug": "beast-tv",
        "connection_types": ["xtream"],
        "sort_order": 2,
    },
    {
        "name": "Falcon TV",
        "slug": "falcon-tv",
        "connection_types": ["xtream", "m3u"],
        "sort_order": 3,
    },
    {
        "name": "Kemo IPTV",
        "slug": "kemo-iptv",
        "connection_types": ["xtream"],
        "sort_order": 4,
    },
    {
        "name": "Xtreme HD IPTV",
        "slug": "xtreme-hd-iptv",
        "connection_types": ["xtream", "m3u"],
        "sort_order": 5,
    },
]


async def seed_channel_index() -> int:
    """Seed the channel_index collection. Returns count of entries created."""
    created = 0
    for ch in SEED_CHANNELS:
        existing = await ChannelIndexEntry.find_one(
            ChannelIndexEntry.canonical_name == ch["canonical_name"],
        )
        if existing:
            continue
        entry = ChannelIndexEntry(
            canonical_name=ch["canonical_name"],
            aliases=ch.get("aliases", []),
            category=ch["category"],
            language=ch["language"],
            country=ch["country"],
        )
        await entry.insert()
        created += 1
    return created


async def seed_providers() -> int:
    """Seed the byoc_providers collection. Returns count created."""
    created = 0
    for prov in SEED_PROVIDERS:
        existing = await BYOCProvider.find_one(
            BYOCProvider.slug == prov["slug"],
        )
        if existing:
            continue
        provider = BYOCProvider(
            name=prov["name"],
            slug=prov["slug"],
            connection_types=prov["connection_types"],
            server_url=prov.get("server_url"),
            m3u_url_template=prov.get("m3u_url_template"),
            sort_order=prov.get("sort_order", 0),
        )
        await provider.insert()
        created += 1
    return created


async def main() -> None:
    await connect_to_mongo_subset([ChannelIndexEntry, BYOCProvider])

    channels = await seed_channel_index()
    logger.info("Seeded channel_index: %d new entries", channels)

    providers = await seed_providers()
    logger.info("Seeded byoc_providers: %d new entries", providers)


if __name__ == "__main__":
    asyncio.run(main())
