#!/bin/bash
# Upload SSRF domain whitelist secrets to Google Cloud Secret Manager
# This script creates/updates the SSRF protection domain whitelists in GCP Secret Manager

set -e

PROJECT_ID="bayit-plus"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Uploading SSRF Domain Whitelists to GCP Secret Manager       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to create or update a secret
upload_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    echo -e "${YELLOW}Processing: ${secret_name}${NC}"

    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        # Secret exists, add new version
        echo "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$PROJECT_ID" \
            --data-file=- 2>/dev/null
        echo -e "${GREEN}✓ Updated existing secret: ${secret_name}${NC}"
    else
        # Secret doesn't exist, create it
        echo "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --data-file=- \
            --labels="category=ssrf-protection" 2>/dev/null
        echo -e "${GREEN}✓ Created new secret: ${secret_name}${NC}"
    fi
    echo ""
}

# ALLOWED_IMAGE_DOMAINS
# Default domains for image downloads (TMDB, Google, YouTube)
IMAGE_DOMAINS='["image.tmdb.org","api.themoviedb.org","storage.googleapis.com","lh3.googleusercontent.com","i.ytimg.com","img.youtube.com"]'
upload_secret "bayit-allowed-image-domains" "$IMAGE_DOMAINS" "SSRF: Whitelisted domains for image downloads"

# ALLOWED_AUDIO_DOMAINS
# Default domains for podcast/audio downloads
AUDIO_DOMAINS='["anchor.fm","spotify.com","podcasts.apple.com","feeds.buzzsprout.com","feeds.transistor.fm","feeds.soundcloud.com","feeds.megaphone.fm","feeds.simplecast.com","feeds.art19.com","feeds.howstuffworks.com","feeds.npr.org","feeds.podcastone.com","rss.art19.com","traffic.megaphone.fm","traffic.libsyn.com","media.blubrry.com","dcs.megaphone.fm","storage.googleapis.com","s3.amazonaws.com","cloudfront.net"]'
upload_secret "bayit-allowed-audio-domains" "$AUDIO_DOMAINS" "SSRF: Whitelisted domains for audio downloads"

# ALLOWED_SUBTITLE_DOMAINS
# Default domains for subtitle downloads
SUBTITLE_DOMAINS='["api.opensubtitles.com","rest.opensubtitles.org","storage.googleapis.com"]'
upload_secret "bayit-allowed-subtitle-domains" "$SUBTITLE_DOMAINS" "SSRF: Whitelisted domains for subtitle downloads"

# ALLOWED_EPG_DOMAINS
# Default domains for EPG data fetching
EPG_DOMAINS='["www.kan.org.il","kan.org.il","api.mako.co.il","raw.githubusercontent.com","github.com","iptv-org.github.io","tv.schedulesdirect.org","storage.googleapis.com"]'
upload_secret "bayit-allowed-epg-domains" "$EPG_DOMAINS" "SSRF: Whitelisted domains for EPG data"

# ALLOWED_SCRAPER_DOMAINS
# Default domains for content scrapers
SCRAPER_DOMAINS='["youtube.com","youtu.be","www.youtube.com","podcasts.apple.com","rss.art19.com","feeds.megaphone.fm","feeds.simplecast.com","feeds.howstuffworks.com","feeds.npr.org","feeds.podcastone.com","feeds.buzzsprout.com","feeds.transistor.fm","feeds.soundcloud.com","anchor.fm","storage.googleapis.com"]'
upload_secret "bayit-allowed-scraper-domains" "$SCRAPER_DOMAINS" "SSRF: Whitelisted domains for content scrapers"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  SSRF Domain Whitelists Upload Complete                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}All 5 SSRF domain whitelist secrets uploaded to GCP Secret Manager.${NC}"
echo ""
echo -e "${YELLOW}To customize these whitelists:${NC}"
echo -e "  1. Edit this script with your custom domains"
echo -e "  2. Re-run: ./upload_ssrf_secrets.sh"
echo ""
echo -e "${YELLOW}Or update individual secrets via gcloud CLI:${NC}"
echo -e "  echo '[\"domain1.com\",\"domain2.com\"]' | gcloud secrets versions add bayit-allowed-image-domains --data-file=-"
echo ""
echo -e "${YELLOW}To retrieve secrets for local .env:${NC}"
echo -e "  ./retrieve_secrets.sh > .env"
echo ""
