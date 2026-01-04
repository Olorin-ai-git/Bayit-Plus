#!/usr/bin/env python3
"""
Transaction Dataset Generator

Generates 10,000 realistic transaction records with fraud patterns based on the provided schema.
Distribution: ~85% legitimate, ~15% suspicious/fraudulent transactions.

Author: Gil Klainert
"""

import csv
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import re

class TransactionGenerator:
    """Generates realistic transaction records with fraud patterns."""
    
    def __init__(self):
        self.start_date = datetime.now() - timedelta(days=30)
        self.end_date = datetime.now()
        
        # Fraud indicators
        self.temp_email_domains = [
            "tempmail.org", "10minutemail.com", "guerrillamail.com", 
            "mailinator.com", "temp-mail.org", "throwaway.email",
            "yopmail.com", "fakeinbox.com", "tempmail.io", "dispostable.com"
        ]
        
        self.legitimate_domains = [
            "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", 
            "protonmail.com", "icloud.com", "aol.com", "live.com",
            "msn.com", "comcast.net", "verizon.net", "att.net"
        ]
        
        self.authorization_stages = {
            "legitimate": ["authorized"],
            "suspicious": ["pending_review", "flagged_suspicious", "under_investigation"],
            "fraudulent": ["declined", "flagged_high_risk", "under_investigation"]
        }
        
        self.first_names = [
            "John", "Jane", "Michael", "Sarah", "David", "Lisa", "Robert", "Jennifer",
            "William", "Mary", "James", "Patricia", "Charles", "Linda", "Joseph", "Barbara",
            "Thomas", "Elizabeth", "Christopher", "Maria", "Daniel", "Susan", "Paul", "Jessica",
            "Mark", "Karen", "Donald", "Nancy", "Steven", "Helen", "Kenneth", "Betty",
            "Joshua", "Dorothy", "Kevin", "Sandra", "Brian", "Donna", "George", "Carol",
            "Alex", "Anna", "Ryan", "Emma", "Nick", "Olivia", "Sam", "Sophia", "Ben", "Amy"
        ]
        
        self.suspicious_patterns = {
            "rapid_sequences": [],  # Will store user IDs for rapid transaction patterns
            "late_night_users": [],  # Users who frequently transact late at night
            "temp_email_users": []   # Users with temporary email addresses
        }

    def generate_uuid(self) -> str:
        """Generate a realistic UUID."""
        return str(uuid.uuid4()).replace("-", "")

    def generate_app_id(self) -> str:
        """Generate realistic app ID."""
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return "".join(random.choices(chars, k=16))

    def generate_email(self, is_fraudulent: bool = False, first_name: str = None) -> Tuple[str, str]:
        """Generate email and normalized email."""
        if first_name is None:
            first_name = random.choice(self.first_names)
        
        base_name = first_name.lower()
        
        if is_fraudulent and random.random() < 0.7:  # 70% of fraudulent use temp emails
            domain = random.choice(self.temp_email_domains)
            # Add random numbers/chars to make it look suspicious
            base_name += str(random.randint(100, 9999))
        else:
            domain = random.choice(self.legitimate_domains)
            
        # Add variations for legitimate emails
        if not is_fraudulent and random.random() < 0.3:
            variations = [f"{base_name}.{random.choice(['smith', 'johnson', 'brown', 'davis'])}",
                         f"{base_name}{random.randint(1, 99)}",
                         f"{base_name}.{random.choice(['work', 'personal', 'main'])}"]
            base_name = random.choice(variations)
        
        original_email = f"{base_name}@{domain}"
        
        # Create normalized version (remove dots, lowercase)
        normalized = original_email.replace(".", "").lower()
        if "gmail.com" in original_email:
            # Gmail ignores dots in username
            user_part = original_email.split("@")[0].replace(".", "")
            normalized = f"{user_part}@gmail.com"
        
        return original_email, normalized

    def generate_timestamp(self, is_suspicious: bool = False) -> Tuple[datetime, datetime, datetime, int]:
        """Generate realistic timestamps."""
        # Base transaction time
        if is_suspicious and random.random() < 0.4:  # 40% of suspicious are late night
            # Late night transactions (11 PM - 4 AM)
            hour = random.choice([23, 0, 1, 2, 3, 4])
            tx_time = self.start_date.replace(hour=hour, minute=random.randint(0, 59))
            tx_time += timedelta(days=random.randint(0, 29))
        else:
            # Normal business hours
            tx_time = self.start_date + timedelta(
                days=random.randint(0, 29),
                hours=random.randint(8, 20),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59),
                microseconds=random.randint(0, 999999)
            )
        
        # Received time (usually same or slightly after)
        received_offset = random.randint(0, 300)  # 0-5 minutes
        received_time = tx_time + timedelta(seconds=received_offset)
        
        # Snowflake upload time (usually 5-20 minutes after)
        upload_offset = random.randint(300, 1200)  # 5-20 minutes
        upload_time = received_time + timedelta(seconds=upload_offset)
        
        # Timestamp in milliseconds
        timestamp_ms = int(tx_time.timestamp() * 1000)
        
        return tx_time, received_time, upload_time, timestamp_ms

    def generate_user_sequence(self, user_id: str, count: int) -> List[Dict]:
        """Generate a sequence of transactions for rapid fraud pattern."""
        transactions = []
        base_time = self.start_date + timedelta(days=random.randint(0, 25))
        
        for i in range(count):
            # Rapid sequence: transactions within minutes of each other
            tx_time = base_time + timedelta(minutes=random.randint(0, 30))
            received_time = tx_time + timedelta(seconds=random.randint(0, 60))
            upload_time = received_time + timedelta(minutes=random.randint(1, 5))
            
            transaction = {
                'tx_datetime': tx_time,
                'received_datetime': received_time,
                'upload_datetime': upload_time,
                'timestamp_ms': int(tx_time.timestamp() * 1000),
                'user_id': user_id,
                'is_fraudulent': True
            }
            transactions.append(transaction)
            
        return transactions

    def create_record_timestamps(self) -> Tuple[datetime, datetime]:
        """Create table record timestamps."""
        created = self.start_date + timedelta(days=random.randint(0, 29))
        updated = created + timedelta(minutes=random.randint(1, 600))
        return created, updated

    def generate_transaction(self, fraud_type: str = "legitimate") -> Dict:
        """Generate a single transaction record."""
        is_fraudulent = fraud_type != "legitimate"
        is_suspicious = fraud_type == "suspicious"
        
        # Generate IDs
        original_tx_id = self.generate_uuid()
        client_request_id = str(uuid.uuid4())
        app_id = self.generate_app_id()
        tx_id_key = original_tx_id
        
        # Generate user info
        first_name = random.choice(self.first_names)
        email, normalized_email = self.generate_email(is_fraudulent, first_name)
        
        # Generate unique user ID
        unique_user_id = f"{app_id}::{str(uuid.uuid4())}"
        
        # Generate timestamps
        tx_time, received_time, upload_time, timestamp_ms = self.generate_timestamp(is_suspicious)
        created_time, updated_time = self.create_record_timestamps()
        
        # Generate composite IDs
        surrogate_app_tx_id = f"{app_id}::{original_tx_id}"
        nsure_unique_tx_id = f"tx::{app_id}::{original_tx_id}"
        
        # Authorization stage based on fraud type
        if fraud_type == "legitimate":
            auth_stage = random.choice(self.authorization_stages["legitimate"])
        elif fraud_type == "suspicious":
            auth_stage = random.choice(self.authorization_stages["suspicious"])
        else:  # fraudulent
            auth_stage = random.choice(self.authorization_stages["fraudulent"])
        
        # Is sent for review flag
        is_sent_for_review = 1 if auth_stage in ["pending_review", "flagged_suspicious", "flagged_high_risk", "under_investigation"] else 0
        
        return {
            'TABLE_RECORD_CREATED_AT': created_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-5],
            'TABLE_RECORD_UPDATED_AT': updated_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-5],
            'EVENT_TYPE': 'tx',
            'ORIGINAL_TX_ID': original_tx_id,
            'STORE_ID': '',  # Empty as in sample
            'CLIENT_REQUEST_ID': client_request_id,
            'APP_ID': app_id,
            'TX_ID_KEY': tx_id_key,
            'SURROGATE_APP_TX_ID': surrogate_app_tx_id,
            'NSURE_UNIQUE_TX_ID': nsure_unique_tx_id,
            'UNIQUE_USER_ID': unique_user_id,
            'TX_DATETIME': tx_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-5],
            'TX_RECEIVED_DATETIME': received_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-5],
            'TX_UPLOADED_TO_SNOWFLAKE': upload_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-5],
            'TX_TIMESTAMP_MS': timestamp_ms,
            'IS_SENT_FOR_NSURE_REVIEW': is_sent_for_review,
            'AUTHORIZATION_STAGE': auth_stage,
            'EMAIL': email,
            'EMAIL_NORMALIZED': normalized_email,
            'FIRST_NAME': first_name
        }

    def generate_dataset(self, total_records: int = 10000) -> List[Dict]:
        """Generate the complete dataset with proper fraud distribution."""
        dataset = []
        
        # Distribution: 85% legitimate, 10% suspicious, 5% fraudulent
        legitimate_count = int(total_records * 0.85)
        suspicious_count = int(total_records * 0.10)
        fraudulent_count = total_records - legitimate_count - suspicious_count
        
        print(f"Generating {total_records} transaction records:")
        print(f"- Legitimate: {legitimate_count} ({legitimate_count/total_records*100:.1f}%)")
        print(f"- Suspicious: {suspicious_count} ({suspicious_count/total_records*100:.1f}%)")
        print(f"- Fraudulent: {fraudulent_count} ({fraudulent_count/total_records*100:.1f}%)")
        
        # Generate legitimate transactions
        for i in range(legitimate_count):
            if i % 1000 == 0:
                print(f"Generated {i} legitimate transactions...")
            dataset.append(self.generate_transaction("legitimate"))
        
        # Generate suspicious transactions
        for i in range(suspicious_count):
            if i % 100 == 0 and i > 0:
                print(f"Generated {i} suspicious transactions...")
            dataset.append(self.generate_transaction("suspicious"))
        
        # Generate fraudulent transactions (including rapid sequences)
        rapid_sequence_count = min(fraudulent_count // 3, 50)  # Max 50 rapid sequences
        regular_fraudulent = fraudulent_count - (rapid_sequence_count * 3)  # 3 txns per sequence
        
        # Generate rapid sequence fraudulent transactions
        for i in range(rapid_sequence_count):
            user_id = f"FRAUD_USER_{i}::{str(uuid.uuid4())}"
            sequence = self.generate_user_sequence(user_id, 3)  # 3 rapid transactions per user
            for seq_tx in sequence:
                fraud_record = self.generate_transaction("fraudulent")
                fraud_record['UNIQUE_USER_ID'] = seq_tx['user_id']
                fraud_record['TX_DATETIME'] = seq_tx['tx_datetime'].strftime('%Y-%m-%d %H:%M:%S.%f')[:-5]
                fraud_record['TX_RECEIVED_DATETIME'] = seq_tx['received_datetime'].strftime('%Y-%m-%d %H:%M:%S.%f')[:-5]
                fraud_record['TX_UPLOADED_TO_SNOWFLAKE'] = seq_tx['upload_datetime'].strftime('%Y-%m-%d %H:%M:%S.%f')[:-5]
                fraud_record['TX_TIMESTAMP_MS'] = seq_tx['timestamp_ms']
                dataset.append(fraud_record)
        
        # Generate regular fraudulent transactions
        for i in range(regular_fraudulent):
            if i % 100 == 0 and i > 0:
                print(f"Generated {i} regular fraudulent transactions...")
            dataset.append(self.generate_transaction("fraudulent"))
        
        # Shuffle the dataset to mix transaction types
        random.shuffle(dataset)
        
        print(f"Dataset generation complete: {len(dataset)} total records")
        return dataset

    def save_to_csv(self, dataset: List[Dict], filename: str):
        """Save dataset to CSV file."""
        fieldnames = [
            'TABLE_RECORD_CREATED_AT', 'TABLE_RECORD_UPDATED_AT', 'EVENT_TYPE',
            'ORIGINAL_TX_ID', 'STORE_ID', 'CLIENT_REQUEST_ID', 'APP_ID', 'TX_ID_KEY',
            'SURROGATE_APP_TX_ID', 'NSURE_UNIQUE_TX_ID', 'UNIQUE_USER_ID',
            'TX_DATETIME', 'TX_RECEIVED_DATETIME', 'TX_UPLOADED_TO_SNOWFLAKE',
            'TX_TIMESTAMP_MS', 'IS_SENT_FOR_NSURE_REVIEW', 'AUTHORIZATION_STAGE',
            'EMAIL', 'EMAIL_NORMALIZED', 'FIRST_NAME'
        ]
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(dataset)
        
        print(f"Dataset saved to: {filename}")

def main():
    """Main execution function."""
    print("Transaction Dataset Generator")
    print("=" * 50)
    
    # Set random seed for reproducible results (optional)
    random.seed(42)
    
    # Create generator
    generator = TransactionGenerator()
    
    # Generate dataset
    dataset = generator.generate_dataset(10000)
    
    # Save to CSV
    filename = '/Users/gklainert/Documents/olorin/transaction_dataset_10k.csv'
    generator.save_to_csv(dataset, filename)
    
    # Print summary statistics
    print("\nDataset Summary:")
    print("-" * 30)
    
    auth_stages = {}
    temp_email_count = 0
    late_night_count = 0
    
    for record in dataset:
        # Count authorization stages
        stage = record['AUTHORIZATION_STAGE']
        auth_stages[stage] = auth_stages.get(stage, 0) + 1
        
        # Count temp emails
        email_domain = record['EMAIL'].split('@')[1]
        if email_domain in generator.temp_email_domains:
            temp_email_count += 1
        
        # Count late night transactions (11 PM - 4 AM)
        tx_time = datetime.strptime(record['TX_DATETIME'], '%Y-%m-%d %H:%M:%S.%f')
        if tx_time.hour >= 23 or tx_time.hour <= 4:
            late_night_count += 1
    
    print(f"Authorization Stages:")
    for stage, count in sorted(auth_stages.items()):
        print(f"  {stage}: {count} ({count/len(dataset)*100:.1f}%)")
    
    print(f"\nFraud Indicators:")
    print(f"  Temporary email domains: {temp_email_count} ({temp_email_count/len(dataset)*100:.1f}%)")
    print(f"  Late night transactions: {late_night_count} ({late_night_count/len(dataset)*100:.1f}%)")
    print(f"  Records sent for review: {sum(1 for r in dataset if r['IS_SENT_FOR_NSURE_REVIEW'] == 1)}")

if __name__ == "__main__":
    main()