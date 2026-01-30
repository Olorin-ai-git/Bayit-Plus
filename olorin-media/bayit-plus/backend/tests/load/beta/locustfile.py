"""
Load testing for Beta 500 AI features using Locust.

Target: 500 concurrent users performing AI search and recommendations.

Usage:
    # Start load test
    locust -f locustfile.py --host=https://staging.bayit.plus

    # Headless mode with 500 users
    locust -f locustfile.py --headless --host=https://staging.bayit.plus \
        --users 500 --spawn-rate 50 --run-time 30m

    # Access web UI
    http://localhost:8089
"""

import random
import json
from locust import HttpUser, task, between, events
from locust.exception import RescheduleTask


class BetaUser(HttpUser):
    """
    Simulated Beta 500 user performing AI operations.

    Behavior:
    - Authenticates as Beta user on start
    - Performs AI searches (weighted 3x)
    - Gets AI recommendations (weighted 2x)
    - Checks credit balance (weighted 1x)
    """

    wait_time = between(1, 5)  # 1-5 seconds between tasks

    # Sample queries for AI search
    SEARCH_QUERIES = [
        "suspenseful crime thrillers",
        "family-friendly comedies for kids",
        "action movies with strong female leads",
        "nature documentaries about wildlife",
        "romantic dramas from the 90s",
        "sci-fi series with time travel",
        "historical fiction podcasts",
        "mystery audiobooks with twists",
        "cooking shows for beginners",
        "true crime podcasts",
        "Israeli TV shows with subtitles",
        "Spanish language learning content",
        "meditation and mindfulness audiobooks",
        "stand-up comedy specials",
        "musical theater recordings"
    ]

    # Content types for recommendations
    CONTENT_TYPES = ["movies", "series", "podcasts", "audiobooks"]

    # Recommendation contexts
    CONTEXTS = [
        "Looking for something exciting to watch tonight",
        "Need something relaxing for the weekend",
        "Want to learn something new",
        "Looking for family entertainment",
        "Need background content while working",
        None  # No context
    ]

    def on_start(self):
        """
        Called when a simulated user starts.
        Authenticates and sets up user session.
        """
        # Generate unique user ID (1-500 for Beta program)
        self.user_id = f"beta-user-{random.randint(1, 500)}"

        # Authenticate (mock endpoint)
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": f"{self.user_id}@example.com",
                "password": "test_password"
            },
            name="/auth/login"
        )

        if response.status_code == 200:
            self.token = response.json().get("token")
        else:
            # If auth fails, reschedule
            raise RescheduleTask()

    @task(3)
    def ai_search(self):
        """
        Perform AI search (weighted 3x - most common operation).

        Cost: 2 credits per search
        """
        query = random.choice(self.SEARCH_QUERIES)
        content_types = random.sample(self.CONTENT_TYPES, k=random.randint(1, 2))

        response = self.client.post(
            "/api/v1/beta/search",
            json={
                "query": query,
                "content_types": content_types,
                "limit": random.choice([10, 20])
            },
            name="/beta/search",
            headers={"Authorization": f"Bearer {self.token}"}
        )

        if response.status_code == 200:
            data = response.json()
            # Track credits deducted
            self.environment.events.request.fire(
                request_type="CREDIT",
                name="search_credit_deduction",
                response_time=0,
                response_length=data.get("credits_charged", 2),
                exception=None,
                context={}
            )
        elif response.status_code == 400 and "insufficient" in response.text.lower():
            # User ran out of credits - expected behavior
            pass

    @task(2)
    def ai_recommendations(self):
        """
        Get AI recommendations (weighted 2x).

        Cost: 3 credits per request
        """
        content_type = random.choice(self.CONTENT_TYPES)
        context = random.choice(self.CONTEXTS)

        params = {
            "content_type": content_type,
            "limit": random.choice([10, 15, 20])
        }

        if context:
            params["context"] = context

        response = self.client.get(
            "/api/v1/beta/recommendations",
            params=params,
            name="/beta/recommendations",
            headers={"Authorization": f"Bearer {self.token}"}
        )

        if response.status_code == 200:
            data = response.json()
            # Track credits deducted
            self.environment.events.request.fire(
                request_type="CREDIT",
                name="recommendations_credit_deduction",
                response_time=0,
                response_length=data.get("credits_charged", 3),
                exception=None,
                context={}
            )

    @task(1)
    def check_balance(self):
        """
        Check credit balance (weighted 1x - least common).

        Cost: 0 credits
        """
        response = self.client.get(
            f"/api/v1/beta/credits/balance/{self.user_id}",
            name="/beta/credits/balance",
            headers={"Authorization": f"Bearer {self.token}"}
        )

        if response.status_code == 200:
            data = response.json()
            remaining = data.get("remaining_credits", 0)

            # Log if user is running low on credits
            if remaining < 100:
                self.environment.events.request.fire(
                    request_type="ALERT",
                    name="low_credits_warning",
                    response_time=0,
                    response_length=remaining,
                    exception=None,
                    context={}
                )

    def on_stop(self):
        """
        Called when a simulated user stops.
        Cleanup and logout.
        """
        if hasattr(self, 'token'):
            self.client.post(
                "/api/v1/auth/logout",
                headers={"Authorization": f"Bearer {self.token}"},
                name="/auth/logout"
            )


# Custom event handlers for tracking Beta-specific metrics

@events.init.add_listener
def on_locust_init(environment, **kwargs):
    """Initialize custom metrics tracking."""
    environment.total_credits_consumed = 0
    environment.low_credit_users = set()


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, context, **kwargs):
    """Track credit consumption and warnings."""
    if request_type == "CREDIT":
        # Track total credits consumed across all users
        if name in ["search_credit_deduction", "recommendations_credit_deduction"]:
            # response_length contains credits charged
            pass  # Could add to environment.total_credits_consumed

    elif request_type == "ALERT":
        # Track users with low credits
        if name == "low_credits_warning":
            pass  # Could add to environment.low_credit_users


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """
    Print summary statistics at test completion.
    """
    print("\n" + "="*80)
    print("BETA 500 LOAD TEST SUMMARY")
    print("="*80)

    stats = environment.stats

    # Overall statistics
    print(f"\nTotal Requests: {stats.total.num_requests}")
    print(f"Total Failures: {stats.total.num_failures}")
    print(f"Failure Rate: {stats.total.fail_ratio*100:.2f}%")
    print(f"Average Response Time: {stats.total.avg_response_time:.2f}ms")
    print(f"Median Response Time (p50): {stats.total.get_response_time_percentile(0.5):.2f}ms")
    print(f"95th Percentile (p95): {stats.total.get_response_time_percentile(0.95):.2f}ms")
    print(f"99th Percentile (p99): {stats.total.get_response_time_percentile(0.99):.2f}ms")
    print(f"Requests per Second: {stats.total.total_rps:.2f}")

    # Beta-specific endpoints
    print("\n" + "-"*80)
    print("BETA ENDPOINT PERFORMANCE")
    print("-"*80)

    for endpoint in ["/beta/search", "/beta/recommendations", "/beta/credits/balance"]:
        if endpoint in stats.entries:
            entry = stats.entries[endpoint]
            print(f"\n{endpoint}:")
            print(f"  Requests: {entry.num_requests}")
            print(f"  Failures: {entry.num_failures} ({entry.fail_ratio*100:.2f}%)")
            print(f"  Avg Response Time: {entry.avg_response_time:.2f}ms")
            print(f"  p95: {entry.get_response_time_percentile(0.95):.2f}ms")
            print(f"  p99: {entry.get_response_time_percentile(0.99):.2f}ms")

    print("\n" + "="*80)


# Custom test shapes for specific load patterns

class RampUpPattern(HttpUser):
    """
    Gradual ramp-up: 0 to 500 users over 10 minutes.
    """
    wait_time = between(1, 5)

    @task
    def load_test(self):
        # Same tasks as BetaUser
        pass


class SpikePattern(HttpUser):
    """
    Spike test: 0 to 500 users in 1 minute.
    """
    wait_time = between(1, 5)

    @task
    def load_test(self):
        # Same tasks as BetaUser
        pass


if __name__ == "__main__":
    print("""
    Beta 500 Load Testing
    =====================

    Usage Examples:

    1. Interactive mode (web UI):
       locust -f locustfile.py --host=https://staging.bayit.plus

    2. Headless mode (500 users, 30 minute test):
       locust -f locustfile.py --headless \\
           --host=https://staging.bayit.plus \\
           --users 500 --spawn-rate 50 --run-time 30m

    3. Gradual ramp-up (10 users/second):
       locust -f locustfile.py --headless \\
           --host=https://staging.bayit.plus \\
           --users 500 --spawn-rate 10 --run-time 30m

    4. Spike test (100 users/second):
       locust -f locustfile.py --headless \\
           --host=https://staging.bayit.plus \\
           --users 500 --spawn-rate 100 --run-time 10m

    5. Endurance test (2 hours):
       locust -f locustfile.py --headless \\
           --host=https://staging.bayit.plus \\
           --users 300 --spawn-rate 20 --run-time 2h

    Target Metrics:
    - Response time p50: < 200ms
    - Response time p95: < 500ms
    - Response time p99: < 1000ms
    - Error rate: < 0.1%
    - RPS: 100+ (for 500 users)
    """)
