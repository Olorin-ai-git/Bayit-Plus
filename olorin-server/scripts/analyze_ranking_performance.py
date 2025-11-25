#!/usr/bin/env python3
"""
Analyze which entities each ranking caught/missed to understand patterns
"""

import json
from collections import defaultdict

# Load results
with open("systematic_test_results.json", "r") as f:
    results = json.load(f)

print("\n" + "=" * 80)
print("DETAILED RANKING COMPARISON")
print("=" * 80 + "\n")

# Analyze each window
for i, (current_window, fraud_aware_window) in enumerate(
    zip(results["current"], results["fraud_aware"]), 1
):

    if (
        current_window["entities_with_fraud"] == 0
        and fraud_aware_window["entities_with_fraud"] == 0
    ):
        continue  # Skip windows with no fraud in either

    print(f"\nWindow {i}: {current_window['window_start'][:10]}")
    print(
        f"  Current: {current_window['entities_with_fraud']} entities, {current_window['total_fraud_txs']} fraud txs"
    )
    print(
        f"  Fraud-Aware: {fraud_aware_window['entities_with_fraud']} entities, {fraud_aware_window['total_fraud_txs']} fraud txs"
    )

    # Get fraud entities from each
    current_fraud = {
        e["email"]: e for e in current_window["entities"] if e["fraud_count"] > 0
    }
    fraud_aware_fraud = {
        e["email"]: e for e in fraud_aware_window["entities"] if e["fraud_count"] > 0
    }

    # Find unique to each
    only_current = set(current_fraud.keys()) - set(fraud_aware_fraud.keys())
    only_fraud_aware = set(fraud_aware_fraud.keys()) - set(current_fraud.keys())
    both = set(current_fraud.keys()) & set(fraud_aware_fraud.keys())

    if only_current:
        print(f"  ✅ ONLY Current caught: {len(only_current)}")
        for email in only_current:
            e = current_fraud[email]
            print(
                f"     - {email}: {e['fraud_count']} fraud, {e['tx_count']} total, ${e['avg_amount']:.0f} avg, {e['unique_ips']} IPs"
            )

    if only_fraud_aware:
        print(f"  ✅ ONLY Fraud-Aware caught: {len(only_fraud_aware)}")
        for email in only_fraud_aware:
            e = fraud_aware_fraud[email]
            print(
                f"     - {email}: {e['fraud_count']} fraud, {e['tx_count']} total, ${e['avg_amount']:.0f} avg, {e['unique_ips']} IPs"
            )

    if both:
        print(f"  ✅ BOTH caught: {len(both)}")

# Aggregate patterns
print("\n" + "=" * 80)
print("PATTERN ANALYSIS OF CAUGHT FRAUD")
print("=" * 80 + "\n")

current_fraud_entities = []
fraud_aware_fraud_entities = []

for window in results["current"]:
    for e in window["entities"]:
        if e["fraud_count"] > 0:
            current_fraud_entities.append(e)

for window in results["fraud_aware"]:
    for e in window["entities"]:
        if e["fraud_count"] > 0:
            fraud_aware_fraud_entities.append(e)


def analyze_entities(entities, label):
    if not entities:
        return

    avg_tx_count = sum(e["tx_count"] for e in entities) / len(entities)
    avg_fraud_count = sum(e["fraud_count"] for e in entities) / len(entities)
    avg_fraud_rate = sum(e["fraud_count"] / e["tx_count"] for e in entities) / len(
        entities
    )
    avg_ips = sum(e["unique_ips"] for e in entities) / len(entities)
    avg_devices = sum(e["unique_devices"] for e in entities) / len(entities)
    avg_amount = sum(e["avg_amount"] for e in entities) / len(entities)

    print(f"{label}:")
    print(f"  Total fraud entities caught: {len(entities)}")
    print(f"  Avg transactions: {avg_tx_count:.1f}")
    print(f"  Avg fraud count: {avg_fraud_count:.1f}")
    print(f"  Avg fraud rate: {avg_fraud_rate*100:.1f}%")
    print(f"  Avg unique IPs: {avg_ips:.1f}")
    print(f"  Avg unique devices: {avg_devices:.1f}")
    print(f"  Avg amount: ${avg_amount:.0f}")
    print()


analyze_entities(current_fraud_entities, "CURRENT RANKING (fraud entities)")
analyze_entities(fraud_aware_fraud_entities, "FRAUD-AWARE RANKING (fraud entities)")

print("\n" + "=" * 80)
print("KEY INSIGHTS")
print("=" * 80 + "\n")

# Compare amounts
current_avg_amount = sum(e["avg_amount"] for e in current_fraud_entities) / len(
    current_fraud_entities
)
fraud_aware_avg_amount = sum(e["avg_amount"] for e in fraud_aware_fraud_entities) / len(
    fraud_aware_fraud_entities
)

print(
    f"Amount difference: Current catches fraud at ${current_avg_amount:.0f} avg, Fraud-Aware at ${fraud_aware_avg_amount:.0f} avg"
)
print(
    f"Fraud-Aware is {fraud_aware_avg_amount/current_avg_amount:.1f}x higher amount fraud"
)
print()

# IP diversity
current_avg_ips = sum(e["unique_ips"] for e in current_fraud_entities) / len(
    current_fraud_entities
)
fraud_aware_avg_ips = sum(e["unique_ips"] for e in fraud_aware_fraud_entities) / len(
    fraud_aware_fraud_entities
)

print(
    f"IP diversity: Current catches fraud with {current_avg_ips:.1f} IPs, Fraud-Aware with {fraud_aware_avg_ips:.1f} IPs"
)
print()

# Transaction count
current_avg_txs = sum(e["tx_count"] for e in current_fraud_entities) / len(
    current_fraud_entities
)
fraud_aware_avg_txs = sum(e["tx_count"] for e in fraud_aware_fraud_entities) / len(
    fraud_aware_fraud_entities
)

print(
    f"Transaction count: Current catches fraud with {current_avg_txs:.1f} txs, Fraud-Aware with {fraud_aware_avg_txs:.1f} txs"
)
print()

print("=" * 80)
print("HYPOTHESIS FOR NEW RANKING")
print("=" * 80 + "\n")
print("Based on analysis:")
print("1. Current ranking works because it catches LOW amount fraud")
print("2. Fraud-Aware ranking emphasizes IP diversity too much")
print("3. Fraud-Aware misses low-IP, high-amount fraud")
print()
print("NEW STRATEGY: Combine approaches")
print("- Keep amount weighting (but inverse for LOW amounts)")
print("- Reduce IP weight")
print("- Add fraud rate component")
print()
