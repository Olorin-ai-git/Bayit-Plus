#!/bin/bash
# Upload Bayit+ Android release to Google Play Store
# Requires: gcloud CLI authenticated, BAYIT_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON secret in GCloud
#
# Usage:
#   ./scripts/upload-google-play.sh              # upload to closed testing (alpha) track
#   ./scripts/upload-google-play.sh production   # upload to production track
#   ./scripts/upload-google-play.sh internal     # upload to internal testing track

set -euo pipefail

TRACK="${1:-alpha}"
PACKAGE_NAME="tv.bayit.plus"
GCLOUD_PROJECT="olorin-auth"
GCLOUD_SECRET="BAYIT_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}Uploading Bayit+ Android -> Google Play ($TRACK track)${NC}"

# Verify tools
command -v gcloud &>/dev/null || { echo -e "${RED}gcloud CLI not found${NC}"; exit 1; }
PYTHON=$(command -v python3.11 || command -v python3 || true)
[ -n "$PYTHON" ] || { echo -e "${RED}python3 not found${NC}"; exit 1; }

# Ensure google-api-python-client is available (use venv to avoid PEP 668)
VENV_DIR="/tmp/bayit-play-upload-venv"
if [ ! -d "$VENV_DIR" ]; then
  echo -e "${YELLOW}Creating Python venv for upload dependencies...${NC}"
  "$PYTHON" -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
"$PYTHON" -c "import googleapiclient" 2>/dev/null || {
  echo -e "${YELLOW}Installing google-api-python-client...${NC}"
  pip install -q google-api-python-client google-auth
}

# Sync signing config if needed
if ! grep -q "bayit.keystore.path" "$PROJECT_DIR/gradle.properties" 2>/dev/null && \
   ! grep -q "bayit.keystore.path" "$PROJECT_DIR/local.properties" 2>/dev/null; then
  echo -e "${YELLOW}Signing config missing -- running sync...${NC}"
  bash "$SCRIPT_DIR/sync-gcloud-secrets.sh"
fi

# Build release AAB
echo -e "${BLUE}Building release AAB...${NC}"
./gradlew bundleRelease --quiet
AAB_PATH="$PROJECT_DIR/app/build/outputs/bundle/release/app-release.aab"
[ -f "$AAB_PATH" ] || { echo -e "${RED}AAB not found at $AAB_PATH${NC}"; exit 1; }
echo -e "${GREEN}Build succeeded${NC}"

# Fetch service account JSON from GCloud Secret Manager
echo -e "${BLUE}Fetching Google Play service account from GCloud...${NC}"
SA_FILE=$(mktemp /tmp/bayit-play-sa-XXXXXX.json)
trap "rm -f $SA_FILE" EXIT
gcloud secrets versions access latest \
  --secret="$GCLOUD_SECRET" \
  --project="$GCLOUD_PROJECT" > "$SA_FILE"

# Upload via Google Play Developer API
echo -e "${BLUE}Uploading to Google Play ($TRACK)...${NC}"
"$PYTHON" - "$AAB_PATH" "$SA_FILE" "$PACKAGE_NAME" "$TRACK" << 'PYEOF'
import sys
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2 import service_account

aab_path, sa_file, package_name, track = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

creds = service_account.Credentials.from_service_account_file(
    sa_file,
    scopes=["https://www.googleapis.com/auth/androidpublisher"],
)
service = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)

edit = service.edits().insert(packageName=package_name, body={}).execute()
edit_id = edit["id"]

try:
    media = MediaFileUpload(aab_path, mimetype="application/octet-stream", resumable=True)
    bundle = service.edits().bundles().upload(
        packageName=package_name,
        editId=edit_id,
        media_body=media,
    ).execute()
    version_code = bundle["versionCode"]

    service.edits().tracks().update(
        packageName=package_name,
        editId=edit_id,
        track=track,
        body={"releases": [{"versionCodes": [str(version_code)], "status": "completed"}]},
    ).execute()

    service.edits().commit(packageName=package_name, editId=edit_id).execute()
    print(f"Uploaded versionCode {version_code} to {track} track")
except Exception as exc:
    service.edits().delete(packageName=package_name, editId=edit_id).execute()
    raise exc
PYEOF

echo -e "${GREEN}Google Play upload complete${NC}"
echo -e "${BLUE}Check: https://play.google.com/console${NC}"
