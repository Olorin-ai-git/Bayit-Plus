#!/usr/bin/env python3
"""
Comprehensive Wizard Backend Endpoint Testing Script

Tests all wizard/voice assistant endpoints with various user input variations.
"""

import requests
import json
from typing import Dict, List, Any
from datetime import datetime
import time

# Configuration
BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Test results storage
test_results = []

def log_test(endpoint: str, test_name: str, status: str, details: Dict[str, Any]):
    """Log test result."""
    result = {
        "timestamp": datetime.now().isoformat(),
        "endpoint": endpoint,
        "test_name": test_name,
        "status": status,
        "details": details
    }
    test_results.append(result)

    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"\n{status_icon} {test_name}")
    print(f"   Endpoint: {endpoint}")
    if "error" in details:
        print(f"   Error: {details['error']}")
    elif "response_time" in details:
        print(f"   Response Time: {details['response_time']:.2f}s")
    if "tools_used" in details:
        print(f"   Tools Used: {', '.join(details['tools_used'])}")

def test_voice_assistant_query(query: str, test_name: str, language: str = "he"):
    """Test the voice assistant query endpoint."""
    endpoint = f"{API_V1}/voice-assistant/query"
    payload = {
        "query": query,
        "language": language,
        "conversation_id": None
    }

    try:
        start_time = time.time()
        response = requests.post(endpoint, json=payload, timeout=30)
        response_time = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            tools_used = []

            # Extract tool usage from response
            if "tool_uses" in data:
                tools_used = [tool["name"] for tool in data["tool_uses"]]

            log_test(endpoint, test_name, "PASS", {
                "query": query,
                "language": language,
                "response_time": response_time,
                "response_length": len(data.get("response", "")),
                "tools_used": tools_used,
                "conversation_id": data.get("conversation_id")
            })
            return data
        else:
            log_test(endpoint, test_name, "FAIL", {
                "query": query,
                "status_code": response.status_code,
                "error": response.text[:200]
            })
            return None
    except Exception as e:
        log_test(endpoint, test_name, "ERROR", {
            "query": query,
            "error": str(e)
        })
        return None

def test_voice_search(query: str, test_name: str, language: str = "he"):
    """Test the simple voice search endpoint."""
    endpoint = f"{API_V1}/voice/search"
    payload = {
        "query": query,
        "language": language
    }

    try:
        start_time = time.time()
        response = requests.post(endpoint, json=payload, timeout=30)
        response_time = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            log_test(endpoint, test_name, "PASS", {
                "query": query,
                "language": language,
                "response_time": response_time,
                "intent": data.get("intent"),
                "results_count": len(data.get("results", []))
            })
            return data
        else:
            log_test(endpoint, test_name, "FAIL", {
                "query": query,
                "status_code": response.status_code,
                "error": response.text[:200]
            })
            return None
    except Exception as e:
        log_test(endpoint, test_name, "ERROR", {
            "query": query,
            "error": str(e)
        })
        return None

def test_basic_search(query: str, test_name: str):
    """Test basic search endpoint."""
    endpoint = f"{API_V1}/search/"
    params = {"q": query}

    try:
        start_time = time.time()
        response = requests.get(endpoint, params=params, timeout=10)
        response_time = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            log_test(endpoint, test_name, "PASS", {
                "query": query,
                "response_time": response_time,
                "results_count": len(data.get("results", []))
            })
            return data
        else:
            log_test(endpoint, test_name, "FAIL", {
                "query": query,
                "status_code": response.status_code,
                "error": response.text[:200]
            })
            return None
    except Exception as e:
        log_test(endpoint, test_name, "ERROR", {
            "query": query,
            "error": str(e)
        })
        return None

def test_genre_search(genre: str, test_name: str):
    """Test genre search endpoint."""
    endpoint = f"{API_V1}/search/genre/{genre}"

    try:
        start_time = time.time()
        response = requests.get(endpoint, timeout=10)
        response_time = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            log_test(endpoint, test_name, "PASS", {
                "genre": genre,
                "response_time": response_time,
                "results_count": len(data.get("results", []))
            })
            return data
        else:
            log_test(endpoint, test_name, "FAIL", {
                "genre": genre,
                "status_code": response.status_code,
                "error": response.text[:200]
            })
            return None
    except Exception as e:
        log_test(endpoint, test_name, "ERROR", {
            "genre": genre,
            "error": str(e)
        })
        return None

def test_actor_search(actor: str, test_name: str):
    """Test actor search endpoint."""
    endpoint = f"{API_V1}/search/cast/{actor}"

    try:
        start_time = time.time()
        response = requests.get(endpoint, timeout=10)
        response_time = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            log_test(endpoint, test_name, "PASS", {
                "actor": actor,
                "response_time": response_time,
                "results_count": len(data.get("results", []))
            })
            return data
        else:
            log_test(endpoint, test_name, "FAIL", {
                "actor": actor,
                "status_code": response.status_code,
                "error": response.text[:200]
            })
            return None
    except Exception as e:
        log_test(endpoint, test_name, "ERROR", {
            "actor": actor,
            "error": str(e)
        })
        return None

def run_comprehensive_tests():
    """Run comprehensive tests across all endpoints."""

    print("=" * 80)
    print("COMPREHENSIVE WIZARD BACKEND ENDPOINT TESTING")
    print("=" * 80)

    # ========================================
    # 1. VOICE ASSISTANT QUERY TESTS (Hebrew)
    # ========================================
    print("\n" + "=" * 80)
    print("1. VOICE ASSISTANT QUERY TESTS (HEBREW)")
    print("=" * 80)

    hebrew_queries = [
        ("מה אתה יכול לעשות?", "General Help Query"),
        ("תמליץ לי על סרט טוב", "Recommendation Request"),
        ("מה לראות הערב?", "Evening Watch Suggestion"),
        ("אני רוצה לראות קומדיה", "Genre Request - Comedy"),
        ("תן לי משהו מצחיק", "Genre Request - Funny"),
        ("מה יש בשידור חי?", "Live TV Query"),
        ("איזה ערוצים יש?", "Channel Listing Query"),
        ("מה מופיע בערוץ 13?", "Specific Channel Query"),
        ("חפש לי סרטים של אדם סנדלר", "Actor Search - Adam Sandler"),
        ("יש סרטים לילדים?", "Kids Content Query"),
        ("תמליץ על משהו למשפחה", "Family Content Request"),
        ("מה חדש?", "New Content Query"),
        ("מה פופולרי?", "Trending Content Query"),
        ("תן לי דרמה", "Genre Request - Drama"),
        ("אני רוצה אקשן", "Genre Request - Action"),
        ("מה יש במדע בדיוני?", "Genre Request - Sci-Fi"),
        ("תמליץ על סדרה", "Series Recommendation"),
        ("יש משהו רומנטי?", "Genre Request - Romance"),
        ("תן לי משהו מפחיד", "Genre Request - Horror"),
        ("מה היה בחדשות?", "News Query"),
    ]

    for query, test_name in hebrew_queries:
        test_voice_assistant_query(query, f"Hebrew: {test_name}", "he")
        time.sleep(0.5)  # Rate limiting

    # ========================================
    # 2. VOICE ASSISTANT QUERY TESTS (English)
    # ========================================
    print("\n" + "=" * 80)
    print("2. VOICE ASSISTANT QUERY TESTS (ENGLISH)")
    print("=" * 80)

    english_queries = [
        ("What can you do?", "General Help Query"),
        ("Recommend a good movie", "Recommendation Request"),
        ("What should I watch tonight?", "Evening Watch Suggestion"),
        ("I want to watch a comedy", "Genre Request - Comedy"),
        ("Give me something funny", "Genre Request - Funny"),
        ("What's on live TV?", "Live TV Query"),
        ("Show me channels", "Channel Listing Query"),
        ("What's on Channel 13?", "Specific Channel Query"),
        ("Find Adam Sandler movies", "Actor Search - Adam Sandler"),
        ("Are there kids movies?", "Kids Content Query"),
        ("Recommend something for family", "Family Content Request"),
        ("What's new?", "New Content Query"),
        ("What's trending?", "Trending Content Query"),
        ("Show me drama", "Genre Request - Drama"),
        ("I want action", "Genre Request - Action"),
        ("Science fiction movies", "Genre Request - Sci-Fi"),
        ("Recommend a series", "Series Recommendation"),
        ("Something romantic?", "Genre Request - Romance"),
        ("Give me horror", "Genre Request - Horror"),
        ("What's the news?", "News Query"),
    ]

    for query, test_name in english_queries:
        test_voice_assistant_query(query, f"English: {test_name}", "en")
        time.sleep(0.5)  # Rate limiting

    # ========================================
    # 3. EDGE CASES - VOICE ASSISTANT
    # ========================================
    print("\n" + "=" * 80)
    print("3. EDGE CASES - VOICE ASSISTANT")
    print("=" * 80)

    edge_cases = [
        ("", "Empty Query"),
        ("   ", "Whitespace Only"),
        ("a", "Single Character"),
        ("מה" * 100, "Very Long Query (Hebrew)"),
        ("!@#$%^&*()", "Special Characters Only"),
        ("123456789", "Numbers Only"),
        ("סרט עם שחקן שאני לא זוכר את השם", "Vague Query"),
        ("something in mixed עברית and English", "Mixed Languages"),
        ("SHOUTING QUERY!!!", "All Caps English"),
        ("קומדיה דרמה אקשן רומנטי מתח פשע", "Multiple Genres"),
    ]

    for query, test_name in edge_cases:
        test_voice_assistant_query(query, f"Edge Case: {test_name}", "he")
        time.sleep(0.5)

    # ========================================
    # 4. VOICE SEARCH TESTS
    # ========================================
    print("\n" + "=" * 80)
    print("4. VOICE SEARCH TESTS")
    print("=" * 80)

    voice_search_queries = [
        ("תמליץ על סרט", "Recommendation Intent", "he"),
        ("קומדיה", "Genre Intent", "he"),
        ("שידור חי", "Live TV Intent", "he"),
        ("אדם סנדלר", "Content Search", "he"),
        ("recommend movie", "Recommendation Intent", "en"),
        ("comedy", "Genre Intent", "en"),
        ("live tv", "Live TV Intent", "en"),
        ("adam sandler", "Content Search", "en"),
    ]

    for query, test_name, language in voice_search_queries:
        test_voice_search(query, f"Voice Search ({language}): {test_name}", language)
        time.sleep(0.5)

    # ========================================
    # 5. BASIC SEARCH TESTS
    # ========================================
    print("\n" + "=" * 80)
    print("5. BASIC SEARCH TESTS")
    print("=" * 80)

    search_queries = [
        ("comedy", "English Genre Search"),
        ("קומדיה", "Hebrew Genre Search"),
        ("action", "English Genre - Action"),
        ("adam sandler", "English Actor"),
        ("matrix", "Movie Title"),
        ("friends", "Series Title"),
        ("news", "News Search"),
        ("kids", "Kids Content"),
    ]

    for query, test_name in search_queries:
        test_basic_search(query, f"Basic Search: {test_name}")
        time.sleep(0.5)

    # ========================================
    # 6. GENRE SEARCH TESTS
    # ========================================
    print("\n" + "=" * 80)
    print("6. GENRE SEARCH TESTS")
    print("=" * 80)

    genres = [
        ("comedy", "Comedy"),
        ("drama", "Drama"),
        ("action", "Action"),
        ("horror", "Horror"),
        ("romance", "Romance"),
        ("sci-fi", "Science Fiction"),
        ("thriller", "Thriller"),
        ("animation", "Animation"),
    ]

    for genre, test_name in genres:
        test_genre_search(genre, f"Genre Search: {test_name}")
        time.sleep(0.5)

    # ========================================
    # 7. ACTOR SEARCH TESTS
    # ========================================
    print("\n" + "=" * 80)
    print("7. ACTOR SEARCH TESTS")
    print("=" * 80)

    actors = [
        ("Adam Sandler", "Adam Sandler"),
        ("Tom Hanks", "Tom Hanks"),
        ("Jennifer Aniston", "Jennifer Aniston"),
        ("Leonardo DiCaprio", "Leonardo DiCaprio"),
        ("Scarlett Johansson", "Scarlett Johansson"),
    ]

    for actor, test_name in actors:
        test_actor_search(actor, f"Actor Search: {test_name}")
        time.sleep(0.5)

    # ========================================
    # 8. MULTI-TURN CONVERSATION TEST
    # ========================================
    print("\n" + "=" * 80)
    print("8. MULTI-TURN CONVERSATION TEST")
    print("=" * 80)

    # First query
    result1 = test_voice_assistant_query(
        "תמליץ על סרט קומדיה",
        "Multi-turn: Initial Query",
        "he"
    )

    if result1 and "conversation_id" in result1:
        conv_id = result1["conversation_id"]

        # Follow-up query with same conversation ID
        endpoint = f"{API_V1}/voice-assistant/query"
        payload = {
            "query": "עוד משהו?",
            "language": "he",
            "conversation_id": conv_id
        }

        try:
            response = requests.post(endpoint, json=payload, timeout=30)
            if response.status_code == 200:
                log_test(endpoint, "Multi-turn: Follow-up Query", "PASS", {
                    "conversation_id": conv_id,
                    "query": "עוד משהו?"
                })
            else:
                log_test(endpoint, "Multi-turn: Follow-up Query", "FAIL", {
                    "status_code": response.status_code
                })
        except Exception as e:
            log_test(endpoint, "Multi-turn: Follow-up Query", "ERROR", {
                "error": str(e)
            })

    # ========================================
    # SUMMARY
    # ========================================
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    total_tests = len(test_results)
    passed = len([r for r in test_results if r["status"] == "PASS"])
    failed = len([r for r in test_results if r["status"] == "FAIL"])
    errors = len([r for r in test_results if r["status"] == "ERROR"])

    print(f"\nTotal Tests: {total_tests}")
    print(f"✅ Passed: {passed} ({passed/total_tests*100:.1f}%)")
    print(f"❌ Failed: {failed} ({failed/total_tests*100:.1f}%)")
    print(f"⚠️  Errors: {errors} ({errors/total_tests*100:.1f}%)")

    # Save detailed results to file
    output_file = "wizard_endpoint_test_results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(test_results, f, ensure_ascii=False, indent=2)

    print(f"\n📄 Detailed results saved to: {output_file}")

    return test_results

if __name__ == "__main__":
    run_comprehensive_tests()
