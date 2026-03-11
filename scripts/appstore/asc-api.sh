#!/bin/bash
# App Store Connect API CLI — Bayit Plus
# Usage: asc-api.sh <command> [args]
#
# Commands:
#   apps                          List all apps
#   versions <app-id>             List all versions for an app
#   version-state <version-id>    Get version state
#   builds <app-id>               List recent builds
#   subscriptions <app-id>        List subscription groups and products
#   sub-state <app-id>            Show subscription states
#   iaps <app-id>                 List in-app purchases
#   create-version <app-id> <platform> <version>  Create a new version (IOS|TV_OS)
#   submit-review <app-id> <platform>             Submit version for review (handles rejections)
#   cancel-review <submission-id>                 Cancel a review submission
#   submit-subscription <sub-id>                  Submit a subscription for review
#   monitor-review <version-id> [interval]        Poll version state until review completes
#   raw <method> <path> [body]                    Raw API call

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GCP_PROJECT="bayit-plus"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

ASC_BASE="https://api.appstoreconnect.apple.com/v1"

# --- JWT Generation ---

_resolve_credentials() {
  if [ -z "${ASC_KEY_ID:-}" ] || [ -z "${ASC_ISSUER_ID:-}" ]; then
    ASC_KEY_ID=$(gcloud secrets versions access latest --secret="omen-asc-key-id" --project="$GCP_PROJECT")
    ASC_ISSUER_ID=$(gcloud secrets versions access latest --secret="omen-asc-issuer-id" --project="$GCP_PROJECT")
  fi
  ASC_KEY_PATH="${ASC_KEY_PATH:-$HOME/private_keys/AuthKey_${ASC_KEY_ID}.p8}"
  if [ ! -f "$ASC_KEY_PATH" ]; then
    mkdir -p "$HOME/private_keys"
    gcloud secrets versions access latest --secret="omen-asc-key-content" --project="$GCP_PROJECT" > "$ASC_KEY_PATH"
    chmod 600 "$ASC_KEY_PATH"
  fi
}

_generate_jwt() {
  _resolve_credentials
  python3 -c "
import jwt, time, sys
with open('${ASC_KEY_PATH}') as f:
    key = f.read()
now = int(time.time())
token = jwt.encode(
    {'iss': '${ASC_ISSUER_ID}', 'iat': now, 'exp': now + 1200, 'aud': 'appstoreconnect-v1'},
    key, algorithm='ES256', headers={'kid': '${ASC_KEY_ID}', 'typ': 'JWT'}
)
print(token)
"
}

# --- HTTP Helpers ---

_get() {
  local path="$1"
  local jwt
  jwt=$(_generate_jwt)
  curl -g -s -H "Authorization: Bearer $jwt" "${ASC_BASE}${path}"
}

_post() {
  local path="$1"
  local body="$2"
  local jwt
  jwt=$(_generate_jwt)
  curl -g -s -X POST -H "Authorization: Bearer $jwt" \
    -H "Content-Type: application/json" \
    "${ASC_BASE}${path}" -d "$body"
}

_patch() {
  local path="$1"
  local body="$2"
  local jwt
  jwt=$(_generate_jwt)
  curl -g -s -X PATCH -H "Authorization: Bearer $jwt" \
    -H "Content-Type: application/json" \
    "${ASC_BASE}${path}" -d "$body"
}

_delete() {
  local path="$1"
  local jwt
  jwt=$(_generate_jwt)
  curl -g -s -w "\n%{http_code}" -X DELETE -H "Authorization: Bearer $jwt" "${ASC_BASE}${path}"
}

_json() {
  python3 -m json.tool 2>/dev/null || cat
}

_check_errors() {
  local response="$1"
  if echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if 'errors' in d else 1)" 2>/dev/null; then
    echo -e "${RED}API Error:${NC}"
    echo "$response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for e in d['errors']:
    print(f\"  [{e['status']}] {e['code']}: {e['detail']}\")
    if 'meta' in e and 'associatedErrors' in e['meta']:
        for k,v in e['meta']['associatedErrors'].items():
            for ae in v:
                print(f\"    -> {ae['code']}: {ae['title']}\")
" 2>/dev/null
    return 1
  fi
  return 0
}

# --- Commands ---

cmd_apps() {
  local response
  response=$(_get "/apps?fields[apps]=name,bundleId,sku")
  if _check_errors "$response"; then
    echo "$response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"{'ID':<14} {'Name':<30} {'Bundle ID':<35} {'SKU'}\")
print('-' * 95)
for app in d['data']:
    a = app['attributes']
    print(f\"{app['id']:<14} {a['name']:<30} {a['bundleId']:<35} {a.get('sku','')}\")
"
  fi
}

cmd_versions() {
  local app_id="${1:?Usage: asc-api.sh versions <app-id>}"
  local response
  response=$(_get "/apps/${app_id}/appStoreVersions?fields[appStoreVersions]=versionString,appStoreState,platform")
  if _check_errors "$response"; then
    echo "$response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"{'ID':<40} {'Platform':<10} {'Version':<10} {'State'}\")
print('-' * 85)
for v in d['data']:
    a = v['attributes']
    print(f\"{v['id']:<40} {a['platform']:<10} {a['versionString']:<10} {a['appStoreState']}\")
"
  fi
}

cmd_version_state() {
  local version_id="${1:?Usage: asc-api.sh version-state <version-id>}"
  local response
  response=$(_get "/appStoreVersions/${version_id}?fields[appStoreVersions]=versionString,appStoreState,platform")
  if _check_errors "$response"; then
    echo "$response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
a = d['data']['attributes']
print(f\"{a['platform']} {a['versionString']}: {a['appStoreState']}\")
"
  fi
}

cmd_builds() {
  local app_id="${1:?Usage: asc-api.sh builds <app-id>}"
  local response
  response=$(_get "/builds?filter[app]=${app_id}&fields[builds]=version,processingState,uploadedDate&sort=-uploadedDate&limit=10")
  if _check_errors "$response"; then
    echo "$response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"{'ID':<40} {'Build':<10} {'State':<20} {'Uploaded'}\")
print('-' * 90)
for b in d['data']:
    a = b['attributes']
    print(f\"{b['id']:<40} {a['version']:<10} {a['processingState']:<20} {a.get('uploadedDate','')[:19]}\")
"
  fi
}

cmd_subscriptions() {
  local app_id="${1:?Usage: asc-api.sh subscriptions <app-id>}"
  local groups_response
  groups_response=$(_get "/apps/${app_id}/subscriptionGroups")
  if ! _check_errors "$groups_response"; then return 1; fi

  echo "$groups_response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for g in d['data']:
    print(f\"Group: {g['attributes']['referenceName']} (ID: {g['id']})\")
"
  local group_ids
  group_ids=$(echo "$groups_response" | python3 -c "import sys,json; [print(g['id']) for g in json.load(sys.stdin)['data']]")

  for gid in $group_ids; do
    local subs_response
    subs_response=$(_get "/subscriptionGroups/${gid}/subscriptions?fields[subscriptions]=name,productId,state")
    if _check_errors "$subs_response"; then
      echo "$subs_response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"  {'ID':<14} {'Name':<20} {'Product ID':<35} {'State'}\")
print('  ' + '-' * 80)
for s in d['data']:
    a = s['attributes']
    print(f\"  {s['id']:<14} {a['name']:<20} {a['productId']:<35} {a['state']}\")
"
    fi
  done
}

cmd_sub_state() {
  local app_id="${1:?Usage: asc-api.sh sub-state <app-id>}"
  cmd_subscriptions "$app_id"
}

cmd_create_version() {
  local app_id="${1:?Usage: asc-api.sh create-version <app-id> <IOS|TV_OS> <version>}"
  local platform="${2:?Platform required (IOS or TV_OS)}"
  local version="${3:?Version string required (e.g. 1.0.1)}"

  echo -e "${BLUE}Creating ${platform} version ${version}...${NC}"
  local response
  response=$(_post "/appStoreVersions" "{
    \"data\": {
      \"type\": \"appStoreVersions\",
      \"attributes\": {
        \"platform\": \"${platform}\",
        \"versionString\": \"${version}\"
      },
      \"relationships\": {
        \"app\": {
          \"data\": { \"type\": \"apps\", \"id\": \"${app_id}\" }
        }
      }
    }
  }")
  if _check_errors "$response"; then
    local vid
    vid=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
    echo -e "${GREEN}Created version ${version} (ID: ${vid})${NC}"
  fi
}

cmd_iaps() {
  local app_id="${1:?Usage: asc-api.sh iaps <app-id>}"
  local response
  response=$(_get "/apps/${app_id}/inAppPurchasesV2?fields[inAppPurchases]=name,productId,inAppPurchaseType,state")
  if _check_errors "$response"; then
    echo "$response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if not d['data']:
    print('No in-app purchases found')
else:
    print(f\"{'ID':<14} {'Name':<25} {'Product ID':<40} {'Type':<18} {'State'}\")
    print('-' * 120)
    for iap in d['data']:
        a = iap['attributes']
        print(f\"{iap['id']:<14} {a['name']:<25} {a['productId']:<40} {a['inAppPurchaseType']:<18} {a['state']}\")
"
  fi
}

cmd_submit_review() {
  local app_id="${1:?Usage: asc-api.sh submit-review <app-id> <IOS|TV_OS>}"
  local platform="${2:?Platform required (IOS or TV_OS)}"

  echo -e "${BLUE}Submitting ${platform} for review...${NC}"

  # Check for existing UNRESOLVED_ISSUES submission first
  local existing
  existing=$(_get "/apps/${app_id}/reviewSubmissions?filter[state]=UNRESOLVED_ISSUES&filter[platform]=${platform}&fields[reviewSubmissions]=state,platform")
  local unresolved_id
  unresolved_id=$(echo "$existing" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('data',[]):
    if r['attributes']['platform'] == '${platform}' and r['attributes']['state'] == 'UNRESOLVED_ISSUES':
        print(r['id'])
        break
" 2>/dev/null)

  if [ -n "$unresolved_id" ]; then
    echo -e "${YELLOW}Found UNRESOLVED_ISSUES submission: ${unresolved_id}${NC}"
    echo -e "${BLUE}Resolving rejected items...${NC}"

    # Get items and resolve any rejected ones
    local items
    items=$(_get "/reviewSubmissions/${unresolved_id}/items")
    echo "$items" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for item in d['data']:
    if item['attributes']['state'] == 'REJECTED':
        print(item['id'])
" | while read -r item_id; do
      _patch "/reviewSubmissionItems/${item_id}" "{
        \"data\": {
          \"type\": \"reviewSubmissionItems\",
          \"id\": \"${item_id}\",
          \"attributes\": { \"resolved\": true }
        }
      }" > /dev/null
      echo -e "${BLUE}Resolved item ${item_id}${NC}"
    done

    # Submit
    local submit_response
    submit_response=$(_patch "/reviewSubmissions/${unresolved_id}" "{
      \"data\": {
        \"type\": \"reviewSubmissions\",
        \"id\": \"${unresolved_id}\",
        \"attributes\": { \"submitted\": true }
      }
    }")
    if _check_errors "$submit_response"; then
      echo -e "${GREEN}Resubmitted for review (ID: ${unresolved_id})${NC}"
    fi
    return
  fi

  # No unresolved submission — create fresh one

  # Step 1: Create review submission
  local response
  response=$(_post "/reviewSubmissions" "{
    \"data\": {
      \"type\": \"reviewSubmissions\",
      \"attributes\": {
        \"platform\": \"${platform}\"
      },
      \"relationships\": {
        \"app\": {
          \"data\": { \"type\": \"apps\", \"id\": \"${app_id}\" }
        }
      }
    }
  }")
  if ! _check_errors "$response"; then return 1; fi

  local review_id
  review_id=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
  echo -e "${BLUE}Review submission created (ID: ${review_id})${NC}"

  # Step 2: Find the editable version for this platform (include REJECTED state)
  local versions_response
  versions_response=$(_get "/apps/${app_id}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED&fields[appStoreVersions]=versionString,appStoreState,platform")
  local version_id
  version_id=$(echo "$versions_response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for v in d['data']:
    if v['attributes']['platform'] == '${platform}':
        print(v['id'])
        break
")
  if [ -z "$version_id" ]; then
    echo -e "${RED}No editable ${platform} version found${NC}"
    return 1
  fi

  # Step 3: Add version as review item
  local item_response
  item_response=$(_post "/reviewSubmissionItems" "{
    \"data\": {
      \"type\": \"reviewSubmissionItems\",
      \"relationships\": {
        \"reviewSubmission\": {
          \"data\": { \"type\": \"reviewSubmissions\", \"id\": \"${review_id}\" }
        },
        \"appStoreVersion\": {
          \"data\": { \"type\": \"appStoreVersions\", \"id\": \"${version_id}\" }
        }
      }
    }
  }")
  if ! _check_errors "$item_response"; then return 1; fi
  echo -e "${BLUE}Added version to review${NC}"

  # Step 4: Submit
  local submit_response
  submit_response=$(_patch "/reviewSubmissions/${review_id}" "{
    \"data\": {
      \"type\": \"reviewSubmissions\",
      \"id\": \"${review_id}\",
      \"attributes\": {
        \"submitted\": true
      }
    }
  }")
  if _check_errors "$submit_response"; then
    echo -e "${GREEN}Submitted for review (ID: ${review_id})${NC}"
  fi
}

cmd_cancel_review() {
  local submission_id="${1:?Usage: asc-api.sh cancel-review <submission-id>}"

  echo -e "${BLUE}Canceling review ${submission_id}...${NC}"
  local response
  response=$(_patch "/reviewSubmissions/${submission_id}" "{
    \"data\": {
      \"type\": \"reviewSubmissions\",
      \"id\": \"${submission_id}\",
      \"attributes\": {
        \"canceled\": true
      }
    }
  }")
  if _check_errors "$response"; then
    echo -e "${GREEN}Review cancellation initiated${NC}"
  fi
}

cmd_submit_subscription() {
  local sub_id="${1:?Usage: asc-api.sh submit-subscription <subscription-id>}"

  echo -e "${BLUE}Submitting subscription ${sub_id}...${NC}"
  local response
  response=$(_post "/subscriptionSubmissions" "{
    \"data\": {
      \"type\": \"subscriptionSubmissions\",
      \"relationships\": {
        \"subscription\": {
          \"data\": { \"type\": \"subscriptions\", \"id\": \"${sub_id}\" }
        }
      }
    }
  }")
  if _check_errors "$response"; then
    echo -e "${GREEN}Subscription submitted for review${NC}"
  fi
}

cmd_monitor_review() {
  local version_id="${1:?Usage: asc-api.sh monitor-review <version-id> [interval-seconds]}"
  local interval="${2:-300}"

  echo -e "${BLUE}Monitoring version ${version_id} (every ${interval}s)...${NC}"
  while true; do
    local response
    response=$(_get "/appStoreVersions/${version_id}?fields[appStoreVersions]=versionString,appStoreState,platform")
    local state
    state=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['attributes']['appStoreState'])")
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')

    case "$state" in
      WAITING_FOR_REVIEW|IN_REVIEW|PROCESSING_FOR_APP_STORE)
        echo -e "${YELLOW}[${ts}] ${state}${NC}"
        ;;
      READY_FOR_SALE)
        echo -e "${GREEN}[${ts}] APPROVED - ${state}${NC}"
        return 0
        ;;
      DEVELOPER_REJECTED|REJECTED|METADATA_REJECTED|INVALID_BINARY|REMOVED_FROM_SALE)
        echo -e "${RED}[${ts}] ${state}${NC}"
        return 1
        ;;
      *)
        echo -e "[${ts}] ${state}"
        ;;
    esac
    sleep "$interval"
  done
}

cmd_raw() {
  local method="${1:?Usage: asc-api.sh raw <GET|POST|PATCH|DELETE> <path> [body]}"
  local path="${2:?Path required}"
  local body="${3:-}"

  case "$method" in
    GET)    _get "$path" | _json ;;
    POST)   _post "$path" "$body" | _json ;;
    PATCH)  _patch "$path" "$body" | _json ;;
    DELETE) _delete "$path" ;;
    *)      echo -e "${RED}Unknown method: ${method}${NC}"; exit 1 ;;
  esac
}

# --- Main ---

cmd="${1:-help}"
shift || true

case "$cmd" in
  apps)               cmd_apps ;;
  versions)           cmd_versions "$@" ;;
  version-state)      cmd_version_state "$@" ;;
  builds)             cmd_builds "$@" ;;
  subscriptions)      cmd_subscriptions "$@" ;;
  sub-state)          cmd_sub_state "$@" ;;
  iaps)               cmd_iaps "$@" ;;
  create-version)     cmd_create_version "$@" ;;
  submit-review)      cmd_submit_review "$@" ;;
  cancel-review)      cmd_cancel_review "$@" ;;
  submit-subscription) cmd_submit_subscription "$@" ;;
  monitor-review)     cmd_monitor_review "$@" ;;
  raw)                cmd_raw "$@" ;;
  help|--help|-h)
    echo "App Store Connect API CLI — Bayit Plus"
    echo ""
    echo "Usage: asc-api.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  apps                                        List all apps"
    echo "  versions <app-id>                           List versions"
    echo "  version-state <version-id>                  Get version state"
    echo "  builds <app-id>                             List recent builds"
    echo "  subscriptions <app-id>                      List subscriptions"
    echo "  sub-state <app-id>                          Show subscription states"
    echo "  iaps <app-id>                               List in-app purchases"
    echo "  create-version <app-id> <IOS|TV_OS> <ver>   Create new version"
    echo "  submit-review <app-id> <IOS|TV_OS>          Submit for review (handles rejections)"
    echo "  cancel-review <submission-id>               Cancel review"
    echo "  submit-subscription <sub-id>                Submit subscription"
    echo "  monitor-review <version-id> [interval]      Poll until review completes"
    echo "  raw <GET|POST|PATCH|DELETE> <path> [body]   Raw API call"
    echo ""
    echo "Bayit Plus App ID: 6758416345"
    echo ""
    echo "Environment:"
    echo "  ASC_KEY_ID       Override key ID (default: from GCloud)"
    echo "  ASC_ISSUER_ID    Override issuer ID (default: from GCloud)"
    echo "  ASC_KEY_PATH     Override key path (default: ~/private_keys/AuthKey_<KEY_ID>.p8)"
    ;;
  *)
    echo -e "${RED}Unknown command: ${cmd}${NC}"
    echo "Run 'asc-api.sh help' for usage"
    exit 1
    ;;
esac
