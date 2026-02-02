#!/bin/bash

# Comprehensive Wizard Backend Endpoint Testing Script
# Tests all wizard/voice assistant endpoints with various user input variations

BASE_URL="http://localhost:8000"
API_V1="${BASE_URL}/api/v1"
RESULTS_FILE="wizard_endpoint_test_results.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Clear results file
> "$RESULTS_FILE"

log_test() {
    local status=$1
    local test_name=$2
    local details=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" == "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
    elif [ "$status" == "FAIL" ]; then
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}❌ FAIL${NC}: $test_name"
    else
        echo -e "${YELLOW}⚠️  WARN${NC}: $test_name"
    fi

    if [ -n "$details" ]; then
        echo "   $details"
    fi

    echo "[$status] $test_name - $details" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
}

test_voice_assistant() {
    local query=$1
    local test_name=$2
    local language=${3:-he}

    echo -e "\n${BLUE}Testing:${NC} $test_name"
    echo "Query: $query"

    local payload=$(cat <<EOF
{
  "query": "$query",
  "language": "$language",
  "conversation_id": null
}
EOF
)

    local response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "${API_V1}/voice-assistant/query")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "200" ]; then
        local response_text=$(echo "$body" | jq -r '.response' 2>/dev/null || echo "")
        local tools_used=$(echo "$body" | jq -r '.tool_uses[]?.name' 2>/dev/null | tr '\n' ',' | sed 's/,$//')
        log_test "PASS" "$test_name" "Tools: [$tools_used] | Response length: ${#response_text} chars"
        echo "$body" | jq '.' >> "$RESULTS_FILE" 2>/dev/null
    else
        log_test "FAIL" "$test_name" "HTTP $http_code: $(echo $body | head -c 100)"
        echo "$body" >> "$RESULTS_FILE"
    fi

    sleep 0.5  # Rate limiting
}

test_voice_search() {
    local query=$1
    local test_name=$2
    local language=${3:-he}

    echo -e "\n${BLUE}Testing:${NC} $test_name"

    local payload=$(cat <<EOF
{
  "query": "$query",
  "language": "$language"
}
EOF
)

    local response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "${API_V1}/voice/search")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "200" ]; then
        local intent=$(echo "$body" | jq -r '.intent' 2>/dev/null)
        local results=$(echo "$body" | jq -r '.results | length' 2>/dev/null)
        log_test "PASS" "$test_name" "Intent: $intent | Results: $results"
    else
        log_test "FAIL" "$test_name" "HTTP $http_code"
    fi

    sleep 0.5
}

test_basic_search() {
    local query=$1
    local test_name=$2

    echo -e "\n${BLUE}Testing:${NC} $test_name"

    local response=$(curl -s -w "\n%{http_code}" -G \
        --data-urlencode "q=$query" \
        "${API_V1}/search/")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "200" ]; then
        local results=$(echo "$body" | jq -r '.results | length' 2>/dev/null || echo "0")
        log_test "PASS" "$test_name" "Results: $results"
    else
        log_test "FAIL" "$test_name" "HTTP $http_code"
    fi

    sleep 0.3
}

test_genre_search() {
    local genre=$1
    local test_name=$2

    echo -e "\n${BLUE}Testing:${NC} $test_name"

    local response=$(curl -s -w "\n%{http_code}" \
        "${API_V1}/search/genre/$genre")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "200" ]; then
        local results=$(echo "$body" | jq -r '.results | length' 2>/dev/null || echo "0")
        log_test "PASS" "$test_name" "Results: $results"
    else
        log_test "FAIL" "$test_name" "HTTP $http_code"
    fi

    sleep 0.3
}

test_actor_search() {
    local actor=$1
    local test_name=$2

    echo -e "\n${BLUE}Testing:${NC} $test_name"

    local response=$(curl -s -w "\n%{http_code}" \
        "${API_V1}/search/cast/$(echo $actor | sed 's/ /%20/g')")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "200" ]; then
        local results=$(echo "$body" | jq -r '.results | length' 2>/dev/null || echo "0")
        log_test "PASS" "$test_name" "Results: $results"
    else
        log_test "FAIL" "$test_name" "HTTP $http_code"
    fi

    sleep 0.3
}

echo "================================================================================"
echo "COMPREHENSIVE WIZARD BACKEND ENDPOINT TESTING"
echo "================================================================================"
echo "Start Time: $(date)"
echo "Base URL: $BASE_URL"
echo ""

# ========================================
# 1. VOICE ASSISTANT QUERY TESTS (Hebrew)
# ========================================
echo ""
echo "================================================================================"
echo "1. VOICE ASSISTANT QUERY TESTS (HEBREW)"
echo "================================================================================"

test_voice_assistant "מה אתה יכול לעשות?" "Hebrew: General Help Query" "he"
test_voice_assistant "תמליץ לי על סרט טוב" "Hebrew: Recommendation Request" "he"
test_voice_assistant "מה לראות הערב?" "Hebrew: Evening Watch Suggestion" "he"
test_voice_assistant "אני רוצה לראות קומדיה" "Hebrew: Genre Request - Comedy" "he"
test_voice_assistant "תן לי משהו מצחיק" "Hebrew: Genre Request - Funny" "he"
test_voice_assistant "מה יש בשידור חי?" "Hebrew: Live TV Query" "he"
test_voice_assistant "איזה ערוצים יש?" "Hebrew: Channel Listing Query" "he"
test_voice_assistant "מה מופיע בערוץ 13?" "Hebrew: Specific Channel Query" "he"
test_voice_assistant "חפש לי סרטים של אדם סנדלר" "Hebrew: Actor Search - Adam Sandler" "he"
test_voice_assistant "יש סרטים לילדים?" "Hebrew: Kids Content Query" "he"
test_voice_assistant "תמליץ על משהו למשפחה" "Hebrew: Family Content Request" "he"
test_voice_assistant "מה חדש?" "Hebrew: New Content Query" "he"
test_voice_assistant "מה פופולרי?" "Hebrew: Trending Content Query" "he"
test_voice_assistant "תן לי דרמה" "Hebrew: Genre Request - Drama" "he"
test_voice_assistant "אני רוצה אקשן" "Hebrew: Genre Request - Action" "he"
test_voice_assistant "מה יש במדע בדיוני?" "Hebrew: Genre Request - Sci-Fi" "he"
test_voice_assistant "תמליץ על סדרה" "Hebrew: Series Recommendation" "he"
test_voice_assistant "יש משהו רומנטי?" "Hebrew: Genre Request - Romance" "he"
test_voice_assistant "תן לי משהו מפחיד" "Hebrew: Genre Request - Horror" "he"
test_voice_assistant "מה היה בחדשות?" "Hebrew: News Query" "he"

# ========================================
# 2. VOICE ASSISTANT QUERY TESTS (English)
# ========================================
echo ""
echo "================================================================================"
echo "2. VOICE ASSISTANT QUERY TESTS (ENGLISH)"
echo "================================================================================"

test_voice_assistant "What can you do?" "English: General Help Query" "en"
test_voice_assistant "Recommend a good movie" "English: Recommendation Request" "en"
test_voice_assistant "What should I watch tonight?" "English: Evening Watch Suggestion" "en"
test_voice_assistant "I want to watch a comedy" "English: Genre Request - Comedy" "en"
test_voice_assistant "Give me something funny" "English: Genre Request - Funny" "en"
test_voice_assistant "What's on live TV?" "English: Live TV Query" "en"
test_voice_assistant "Show me channels" "English: Channel Listing Query" "en"
test_voice_assistant "What's on Channel 13?" "English: Specific Channel Query" "en"
test_voice_assistant "Find Adam Sandler movies" "English: Actor Search - Adam Sandler" "en"
test_voice_assistant "Are there kids movies?" "English: Kids Content Query" "en"
test_voice_assistant "Recommend something for family" "English: Family Content Request" "en"
test_voice_assistant "What's new?" "English: New Content Query" "en"
test_voice_assistant "What's trending?" "English: Trending Content Query" "en"
test_voice_assistant "Show me drama" "English: Genre Request - Drama" "en"
test_voice_assistant "I want action" "English: Genre Request - Action" "en"
test_voice_assistant "Science fiction movies" "English: Genre Request - Sci-Fi" "en"
test_voice_assistant "Recommend a series" "English: Series Recommendation" "en"
test_voice_assistant "Something romantic?" "English: Genre Request - Romance" "en"
test_voice_assistant "Give me horror" "English: Genre Request - Horror" "en"
test_voice_assistant "What's the news?" "English: News Query" "en"

# ========================================
# 3. EDGE CASES - VOICE ASSISTANT
# ========================================
echo ""
echo "================================================================================"
echo "3. EDGE CASES - VOICE ASSISTANT"
echo "================================================================================"

test_voice_assistant "a" "Edge Case: Single Character" "he"
test_voice_assistant "!@#$%^&*()" "Edge Case: Special Characters" "he"
test_voice_assistant "123456789" "Edge Case: Numbers Only" "he"
test_voice_assistant "סרט עם שחקן שאני לא זוכר את השם" "Edge Case: Vague Query" "he"
test_voice_assistant "קומדיה דרמה אקשן רומנטי מתח פשע" "Edge Case: Multiple Genres" "he"
test_voice_assistant "SHOUTING QUERY!!!" "Edge Case: All Caps" "en"

# ========================================
# 4. VOICE SEARCH TESTS
# ========================================
echo ""
echo "================================================================================"
echo "4. VOICE SEARCH TESTS"
echo "================================================================================"

test_voice_search "תמליץ על סרט" "Voice Search: Recommendation Intent (Hebrew)" "he"
test_voice_search "קומדיה" "Voice Search: Genre Intent (Hebrew)" "he"
test_voice_search "שידור חי" "Voice Search: Live TV Intent (Hebrew)" "he"
test_voice_search "אדם סנדלר" "Voice Search: Content Search (Hebrew)" "he"
test_voice_search "recommend movie" "Voice Search: Recommendation Intent (English)" "en"
test_voice_search "comedy" "Voice Search: Genre Intent (English)" "en"
test_voice_search "live tv" "Voice Search: Live TV Intent (English)" "en"
test_voice_search "adam sandler" "Voice Search: Content Search (English)" "en"

# ========================================
# 5. BASIC SEARCH TESTS
# ========================================
echo ""
echo "================================================================================"
echo "5. BASIC SEARCH TESTS"
echo "================================================================================"

test_basic_search "comedy" "Basic Search: English Genre"
test_basic_search "קומדיה" "Basic Search: Hebrew Genre"
test_basic_search "action" "Basic Search: Action Genre"
test_basic_search "adam sandler" "Basic Search: Actor Name"
test_basic_search "matrix" "Basic Search: Movie Title"
test_basic_search "friends" "Basic Search: Series Title"
test_basic_search "news" "Basic Search: News Content"
test_basic_search "kids" "Basic Search: Kids Content"

# ========================================
# 6. GENRE SEARCH TESTS
# ========================================
echo ""
echo "================================================================================"
echo "6. GENRE SEARCH TESTS"
echo "================================================================================"

test_genre_search "comedy" "Genre Search: Comedy"
test_genre_search "drama" "Genre Search: Drama"
test_genre_search "action" "Genre Search: Action"
test_genre_search "horror" "Genre Search: Horror"
test_genre_search "romance" "Genre Search: Romance"
test_genre_search "sci-fi" "Genre Search: Sci-Fi"
test_genre_search "thriller" "Genre Search: Thriller"
test_genre_search "animation" "Genre Search: Animation"

# ========================================
# 7. ACTOR SEARCH TESTS
# ========================================
echo ""
echo "================================================================================"
echo "7. ACTOR SEARCH TESTS"
echo "================================================================================"

test_actor_search "Adam Sandler" "Actor Search: Adam Sandler"
test_actor_search "Tom Hanks" "Actor Search: Tom Hanks"
test_actor_search "Jennifer Aniston" "Actor Search: Jennifer Aniston"
test_actor_search "Leonardo DiCaprio" "Actor Search: Leonardo DiCaprio"
test_actor_search "Scarlett Johansson" "Actor Search: Scarlett Johansson"

# ========================================
# SUMMARY
# ========================================
echo ""
echo "================================================================================"
echo "TEST SUMMARY"
echo "================================================================================"
echo "End Time: $(date)"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}✅ Passed: $PASSED_TESTS ($(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%)${NC}"
echo -e "${RED}❌ Failed: $FAILED_TESTS ($(awk "BEGIN {printf \"%.1f\", ($FAILED_TESTS/$TOTAL_TESTS)*100}")%)${NC}"
echo ""
echo "📄 Detailed results saved to: $RESULTS_FILE"
