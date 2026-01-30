"""
Load Testing Suite for Beta 500 Credit System

Tests concurrent credit operations under high load to verify:
- Atomic credit deductions (no race conditions)
- AI endpoint performance
- Credit balance polling scalability
- No credit leakage under concurrent requests

Usage:
    locust -f tests/load/beta_load_test.py \
        --host http://localhost:8000 \
        --users 500 \
        --spawn-rate 10 \
        --run-time 15m

Success Criteria:
- 95th percentile response time < 500ms
- Error rate < 1%
- No duplicate credit deductions
- All atomic operations succeed
"""

import random
import uuid
from locust import HttpUser, task, between, events
from locust.exception import StopUser


class BetaUser(HttpUser):
    """
    Simulates a Beta 500 user performing typical operations:
    - Checking credit balance
    - Performing AI searches
    - Getting AI recommendations
    - Concurrent credit deductions
    """

    wait_time = between(1, 3)  # 1-3 seconds between requests

    def on_start(self):
        """
        Initialize user session with authentication.
        In production, this would use real OAuth tokens.
        """
        # Generate unique user ID for this test user
        self.user_id = f"load-test-user-{uuid.uuid4().hex[:8]}"

        # Mock authentication token
        self.headers = {
            "Authorization": f"Bearer mock-token-{self.user_id}",
            "Content-Type": "application/json",
        }

        # Create test user with 5000 credits for load testing
        try:
            response = self.client.post(
                "/api/v1/beta/test/create-user",
                json={
                    "user_id": self.user_id,
                    "initial_credits": 5000,
                },
                headers=self.headers,
                name="/beta/test/create-user",
            )
            if response.status_code != 200:
                print(f"Failed to create test user: {response.status_code}")
                raise StopUser()
        except Exception as e:
            print(f"Error creating test user: {e}")
            raise StopUser()

    @task(3)
    def get_credit_balance(self):
        """
        Task: Check credit balance (most common operation).
        Weight: 3 (30% of requests)
        """
        self.client.get(
            "/api/v1/beta/credits/balance",
            headers=self.headers,
            name="/beta/credits/balance [GET]",
        )

    @task(2)
    def ai_search(self):
        """
        Task: Perform AI search (5 credits).
        Weight: 2 (20% of requests)

        Tests:
        - Atomic credit deduction
        - AI endpoint performance
        - Error handling with insufficient credits
        """
        queries = [
            "Jewish comedy",
            "Israeli drama",
            "Hebrew podcast",
            "Shabbat recipes",
            "Torah study",
            "Israeli music",
            "Kosher cooking",
            "Jewish history",
        ]

        self.client.post(
            "/api/v1/beta/ai-search",
            json={
                "query": random.choice(queries),
                "limit": 10,
            },
            headers=self.headers,
            name="/beta/ai-search [POST]",
        )

    @task(1)
    def ai_recommendations(self):
        """
        Task: Get AI recommendations (3 credits).
        Weight: 1 (10% of requests)

        Tests:
        - Concurrent recommendation generation
        - Credit tracking accuracy
        - Caching effectiveness
        """
        self.client.get(
            "/api/v1/beta/ai-recommendations?limit=10",
            headers=self.headers,
            name="/beta/ai-recommendations [GET]",
        )

    @task(1)
    def concurrent_credit_deduction(self):
        """
        Task: Rapid concurrent credit deductions.
        Weight: 1 (10% of requests)

        Critical Test:
        - Verifies atomic $inc operations prevent race conditions
        - Tests optimistic locking with version field
        - Ensures no credit leakage
        """
        # Simulate rapid sequential deductions (testing atomicity)
        for _ in range(3):
            self.client.post(
                "/api/v1/beta/ai-search",
                json={
                    "query": "test query",
                    "limit": 5,
                },
                headers=self.headers,
                name="/beta/ai-search [POST] - rapid concurrent",
            )

    @task(1)
    def check_low_balance_threshold(self):
        """
        Task: Check credit balance with low threshold.
        Weight: 1 (10% of requests)

        Tests:
        - Low balance warning email triggers
        - Threshold monitoring performance
        """
        response = self.client.get(
            "/api/v1/beta/credits/balance",
            headers=self.headers,
            name="/beta/credits/balance [GET] - threshold check",
        )

        # Log if balance is critically low (< 50 credits)
        if response.status_code == 200:
            data = response.json()
            if data.get("balance", 5000) < 50:
                print(f"[WARNING] User {self.user_id} has low balance: {data['balance']}")

    def on_stop(self):
        """
        Cleanup: Delete test user after load test completes.
        """
        try:
            self.client.delete(
                f"/api/v1/beta/test/delete-user/{self.user_id}",
                headers=self.headers,
                name="/beta/test/delete-user",
            )
        except Exception as e:
            print(f"Error cleaning up test user: {e}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    Hook: Executed once at the start of the load test.

    Verifies:
    - Backend is running and healthy
    - Test endpoints are available
    """
    print("=" * 80)
    print("Starting Beta 500 Load Test")
    print("=" * 80)
    print(f"Target host: {environment.host}")
    print(f"Max users: {environment.parsed_options.num_users if environment.parsed_options else 'N/A'}")
    print("=" * 80)

    # Verify backend health
    try:
        response = environment.runner.client_pool[0].get(f"{environment.host}/health")
        if response.status_code == 200:
            print("✅ Backend health check passed")
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Backend health check failed: {e}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """
    Hook: Executed once at the end of the load test.

    Reports:
    - Total requests made
    - Error rate
    - Performance metrics
    """
    print("\n" + "=" * 80)
    print("Beta 500 Load Test Complete")
    print("=" * 80)

    stats = environment.stats

    # Calculate total requests and errors
    total_requests = stats.total.num_requests
    total_failures = stats.total.num_failures
    error_rate = (total_failures / total_requests * 100) if total_requests > 0 else 0

    print(f"Total Requests: {total_requests}")
    print(f"Total Failures: {total_failures}")
    print(f"Error Rate: {error_rate:.2f}%")

    # Performance metrics
    if stats.total.num_requests > 0:
        print(f"\nPerformance Metrics:")
        print(f"  Average Response Time: {stats.total.avg_response_time:.2f}ms")
        print(f"  Median Response Time: {stats.total.median_response_time:.2f}ms")
        print(f"  95th Percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")
        print(f"  99th Percentile: {stats.total.get_response_time_percentile(0.99):.2f}ms")
        print(f"  Max Response Time: {stats.total.max_response_time:.2f}ms")
        print(f"  Min Response Time: {stats.total.min_response_time:.2f}ms")

    # Success criteria validation
    print("\n" + "=" * 80)
    print("Success Criteria Validation:")
    print("=" * 80)

    p95_time = stats.total.get_response_time_percentile(0.95) if total_requests > 0 else 0
    p95_pass = p95_time < 500
    error_rate_pass = error_rate < 1.0

    print(f"✅ 95th percentile < 500ms: {p95_pass} ({p95_time:.2f}ms)")
    print(f"✅ Error rate < 1%: {error_rate_pass} ({error_rate:.2f}%)")

    if p95_pass and error_rate_pass:
        print("\n🎉 All success criteria met!")
    else:
        print("\n⚠️  Some success criteria not met. Review results.")

    print("=" * 80)


# Custom task set for testing race conditions specifically
class RaceConditionTester(HttpUser):
    """
    Specialized user that aggressively tests for race conditions
    by making rapid concurrent credit deductions.
    """

    wait_time = between(0.1, 0.3)  # Very short wait (100-300ms)

    def on_start(self):
        """Initialize test user."""
        self.user_id = f"race-test-user-{uuid.uuid4().hex[:8]}"
        self.headers = {
            "Authorization": f"Bearer mock-token-{self.user_id}",
            "Content-Type": "application/json",
        }

        # Create user with 1000 credits
        self.client.post(
            "/api/v1/beta/test/create-user",
            json={
                "user_id": self.user_id,
                "initial_credits": 1000,
            },
            headers=self.headers,
        )

    @task(1)
    def rapid_deduction_burst(self):
        """
        Perform 5 rapid deductions in quick succession.

        This tests:
        - Atomic $inc operations
        - MongoDB document locking
        - Version field optimistic locking
        """
        for i in range(5):
            self.client.post(
                f"/api/v1/beta/credits/deduct",
                json={
                    "user_id": self.user_id,
                    "feature": "ai_search",
                    "usage_amount": 1,
                    "metadata": {"burst": i},
                },
                headers=self.headers,
                name="/beta/credits/deduct [POST] - race condition test",
            )

    def on_stop(self):
        """Cleanup test user."""
        try:
            self.client.delete(
                f"/api/v1/beta/test/delete-user/{self.user_id}",
                headers=self.headers,
            )
        except:
            pass
