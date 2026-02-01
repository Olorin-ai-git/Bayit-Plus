"""
Schedules Direct Lineup Discovery Script

Discovers available lineups and channels for Israeli TV on Schedules Direct.

Usage:
    # Set credentials as environment variables
    export SCHEDULES_DIRECT_USERNAME="your_username"
    export SCHEDULES_DIRECT_PASSWORD="your_password"

    # Run discovery
    cd backend
    poetry run python -m app.scripts.discover_sd_lineups
"""

import asyncio
import logging
import os
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def main():
    """Discover Schedules Direct lineups for Israel."""
    # Import here to avoid circular imports
    from app.services.schedules_direct_service import SchedulesDirectService

    # Check for credentials
    username = os.environ.get("SCHEDULES_DIRECT_USERNAME")
    password = os.environ.get("SCHEDULES_DIRECT_PASSWORD")

    if not username or not password:
        logger.error("Missing credentials!")
        logger.error("Set environment variables:")
        logger.error('  export SCHEDULES_DIRECT_USERNAME="your_username"')
        logger.error('  export SCHEDULES_DIRECT_PASSWORD="your_password"')
        sys.exit(1)

    logger.info("=" * 70)
    logger.info("SCHEDULES DIRECT LINEUP DISCOVERY")
    logger.info("=" * 70)

    # Create service instance with credentials
    service = SchedulesDirectService(username=username, password=password)

    try:
        # Step 1: Authenticate
        logger.info("")
        logger.info("Step 1: Authenticating with Schedules Direct...")
        auth_success = await service.authenticate()

        if not auth_success:
            logger.error("Authentication failed! Check your credentials.")
            sys.exit(1)

        logger.info("Authentication successful!")

        # Step 2: Get account status
        logger.info("")
        logger.info("Step 2: Checking account status...")
        status = await service.get_status()

        if status:
            logger.info(f"Account: {status.get('account', {}).get('email', 'N/A')}")
            logger.info(f"Max Lineups: {status.get('account', {}).get('maxLineups', 'N/A')}")

            # Check existing lineups
            lineups = status.get("lineups", [])
            if lineups:
                logger.info(f"Currently subscribed lineups: {len(lineups)}")
                for lineup in lineups:
                    logger.info(f"  - {lineup.get('lineup')}: {lineup.get('name')}")
            else:
                logger.info("No lineups currently subscribed")

        # Step 3: Search for Israeli headends
        logger.info("")
        logger.info("Step 3: Searching for Israeli headends...")
        headends = await service.search_headends(country="ISR")

        if not headends:
            logger.warning("No Israeli headends found!")
            logger.info("Trying alternative searches...")

            # Try different search approaches
            for country in ["IL", "ISR", "972"]:
                headends = await service.search_headends(country=country)
                if headends:
                    logger.info(f"Found headends with country code: {country}")
                    break

        if headends:
            logger.info(f"Found {len(headends)} Israeli headends:")
            logger.info("")

            for headend in headends:
                headend_id = headend.get("headend", "Unknown")
                transport = headend.get("transport", "Unknown")
                location = headend.get("location", "Unknown")

                logger.info(f"Headend: {headend_id}")
                logger.info(f"  Transport: {transport}")
                logger.info(f"  Location: {location}")

                # List lineups within headend
                lineups_list = headend.get("lineups", [])
                for lineup in lineups_list:
                    lineup_id = lineup.get("lineup", "Unknown")
                    lineup_name = lineup.get("name", "Unknown")
                    logger.info(f"  Lineup: {lineup_id}")
                    logger.info(f"    Name: {lineup_name}")

                logger.info("")

            # Step 4: If we found lineups, let's explore the first one
            if headends and headends[0].get("lineups"):
                first_lineup = headends[0]["lineups"][0]
                lineup_id = first_lineup.get("lineup")

                logger.info("=" * 70)
                logger.info(f"Step 4: Exploring lineup: {lineup_id}")
                logger.info("=" * 70)

                # Check if we need to add the lineup first
                if status and lineup_id not in [l.get("lineup") for l in status.get("lineups", [])]:
                    logger.info(f"Adding lineup {lineup_id} to account...")
                    add_result = await service.add_lineup(lineup_id)
                    if add_result:
                        logger.info("Lineup added successfully!")
                    else:
                        logger.warning("Failed to add lineup")

                # Get channels in lineup
                channels = await service.get_lineup_channels(lineup_id)
                if channels:
                    logger.info(f"Found {len(channels)} channels in lineup:")
                    logger.info("")

                    # Group by channel number for easier reading
                    for channel in channels[:50]:  # Show first 50
                        station_id = channel.get("stationID", "Unknown")
                        channel_num = channel.get("channel", "")
                        uhfvhf = channel.get("uhfVhf", "")

                        logger.info(f"  Ch {channel_num}: Station ID {station_id}")

                    if len(channels) > 50:
                        logger.info(f"  ... and {len(channels) - 50} more channels")

        else:
            logger.warning("No Israeli headends found in Schedules Direct")
            logger.info("")
            logger.info("Schedules Direct may not have Israeli channel data.")
            logger.info("Alternative options:")
            logger.info("  1. Check for satellite/cable lineups with Israeli channels")
            logger.info("  2. Use XMLTV sources for Israeli EPG")
            logger.info("  3. Continue using i24news API for i24 channels")

        # Step 5: Try US lineups for international channels
        logger.info("")
        logger.info("=" * 70)
        logger.info("Step 5: Searching US lineups for international channels...")
        logger.info("=" * 70)

        # Try searching US by major city zip codes
        us_postal_codes = [
            ("10001", "New York"),
            ("90210", "Los Angeles"),
            ("60601", "Chicago"),
        ]

        for postal_code, city in us_postal_codes[:1]:  # Just check NY first
            logger.info(f"Searching {city} ({postal_code})...")
            us_headends = await service.search_headends(country="USA", postal_code=postal_code)

            if us_headends:
                logger.info(f"Found {len(us_headends)} headends in {city}")

                # Look for satellite or IPTV providers
                for headend in us_headends:
                    transport = headend.get("transport", "")
                    if "satellite" in transport.lower() or "iptv" in transport.lower():
                        logger.info(f"  Satellite/IPTV: {headend.get('headend')}")

                        # Check lineups for international channels
                        for lineup in headend.get("lineups", []):
                            lineup_name = lineup.get("name", "").lower()
                            if any(kw in lineup_name for kw in ["international", "world", "foreign"]):
                                logger.info(f"    Potential: {lineup.get('lineup')} - {lineup.get('name')}")

        # Step 6: Check available countries
        logger.info("")
        logger.info("=" * 70)
        logger.info("Step 6: Checking available countries...")
        logger.info("=" * 70)

        # Get available country list from SD
        try:
            url = f"{service.BASE_URL}/available/countries"
            response = await service.client.get(url, headers=service._get_headers())
            if response.status_code == 200:
                countries = response.json()
                logger.info(f"Available countries: {len(countries)}")
                for continent in countries:
                    if continent.get("continentName") in ["Asia", "Middle East", "Europe"]:
                        logger.info(f"  {continent.get('continentName')}:")
                        for country in continent.get("countries", []):
                            logger.info(f"    - {country.get('fullName')} ({country.get('shortName')})")
        except Exception as e:
            logger.warning(f"Could not fetch countries list: {e}")

    except Exception as e:
        logger.error(f"Error during discovery: {e}")
        import traceback
        traceback.print_exc()

    finally:
        await service.close()

    logger.info("")
    logger.info("=" * 70)
    logger.info("DISCOVERY COMPLETE")
    logger.info("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
