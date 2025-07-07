// Mock RAG data for demo mode
export const mockRAGResponses = [
  {
    natural_query: "Show me all failed payment transactions in the last 24 hours",
    translated_query: "search index=payments status=failed earliest=-24h@h latest=now | stats count by merchant_id, amount, reason | sort -count",
    response: "Found 127 failed payment transactions across 15 merchants. Top failure reason: insufficient_funds (67%), followed by card_declined (23%) and network_timeout (10%).",
    execution_time: 1.2,
    result_count: 127,
    sources: ["payments_index", "transaction_logs"],
    confidence: 0.92,
    structured_data: {
      data: [
        { merchant_id: "MERCH_001", failed_count: 23, total_amount: 15420.50, primary_reason: "insufficient_funds" },
        { merchant_id: "MERCH_007", failed_count: 18, total_amount: 8925.75, primary_reason: "card_declined" },
        { merchant_id: "MERCH_003", failed_count: 15, total_amount: 12330.25, primary_reason: "insufficient_funds" },
        { merchant_id: "MERCH_012", failed_count: 12, total_amount: 6745.00, primary_reason: "network_timeout" },
        { merchant_id: "MERCH_005", failed_count: 11, total_amount: 9880.40, primary_reason: "card_declined" },
        { merchant_id: "MERCH_009", failed_count: 9, total_amount: 4520.30, primary_reason: "insufficient_funds" },
        { merchant_id: "MERCH_015", failed_count: 8, total_amount: 7230.80, primary_reason: "expired_card" },
        { merchant_id: "MERCH_002", failed_count: 7, total_amount: 3145.90, primary_reason: "network_timeout" }
      ],
      columns: [
        { key: "merchant_id", label: "Merchant ID", type: "string", sortable: true },
        { key: "failed_count", label: "Failed Count", type: "number", sortable: true },
        { key: "total_amount", label: "Total Amount", type: "number", sortable: true },
        { key: "primary_reason", label: "Primary Reason", type: "string", sortable: true }
      ]
    }
  },
  {
    natural_query: "Find suspicious login patterns for high-value users",
    translated_query: "search index=auth_logs user_type=premium | eval time_diff=_time-lag(_time) | where time_diff<300 AND src_ip!=lag(src_ip) | stats count by user_id, src_ip | where count>5",
    response: "Identified 34 premium users with suspicious rapid location changes. 12 users show impossible travel patterns with login times less than 5 minutes apart from different countries.",
    execution_time: 2.1,
    result_count: 34,
    sources: ["auth_logs", "user_profiles", "geolocation_data"],
    confidence: 0.88,
    structured_data: {
      data: [
        { user_id: "USR_89234", login_count: 12, unique_ips: 8, countries: ["US", "Germany", "Japan"], risk_score: 0.95 },
        { user_id: "USR_45678", login_count: 9, unique_ips: 6, countries: ["UK", "Brazil", "India"], risk_score: 0.89 },
        { user_id: "USR_12345", login_count: 11, unique_ips: 7, countries: ["Canada", "France", "Australia"], risk_score: 0.92 },
        { user_id: "USR_67890", login_count: 8, unique_ips: 5, countries: ["US", "China", "Russia"], risk_score: 0.87 },
        { user_id: "USR_54321", login_count: 10, unique_ips: 6, countries: ["Netherlands", "Singapore", "Mexico"], risk_score: 0.91 }
      ],
      columns: [
        { key: "user_id", label: "User ID", type: "string", sortable: true },
        { key: "login_count", label: "Login Count", type: "number", sortable: true },
        { key: "unique_ips", label: "Unique IPs", type: "number", sortable: true },
        { key: "countries", label: "Countries", type: "string", sortable: false },
        { key: "risk_score", label: "Risk Score", type: "number", sortable: true }
      ]
    }
  },
  {
    natural_query: "Show me device fingerprint anomalies in the fraud detection system",
    translated_query: "search index=device_logs | eval device_signature=md5(user_agent+screen_resolution+timezone) | stats dc(device_signature) as unique_devices, count as total_sessions by user_id | where unique_devices>10",
    response: "Detected 23 users with excessive device diversity. Average user typically uses 2-3 devices, but these users show 10+ unique device signatures, indicating potential device spoofing or account sharing.",
    execution_time: 1.8,
    result_count: 23,
    sources: ["device_logs", "fraud_detection"],
    confidence: 0.85,
    structured_data: {
      data: [
        { user_id: "USR_FRAUD_001", unique_devices: 47, total_sessions: 156, avg_session_duration: "4.2 min", first_seen: "2024-01-15", last_seen: "2024-02-01" },
        { user_id: "USR_FRAUD_007", unique_devices: 32, total_sessions: 98, avg_session_duration: "2.8 min", first_seen: "2024-01-20", last_seen: "2024-02-01" },
        { user_id: "USR_FRAUD_012", unique_devices: 28, total_sessions: 145, avg_session_duration: "6.1 min", first_seen: "2024-01-08", last_seen: "2024-02-01" },
        { user_id: "USR_FRAUD_003", unique_devices: 25, total_sessions: 87, avg_session_duration: "3.5 min", first_seen: "2024-01-25", last_seen: "2024-02-01" },
        { user_id: "USR_FRAUD_019", unique_devices: 23, total_sessions: 76, avg_session_duration: "5.3 min", first_seen: "2024-01-12", last_seen: "2024-01-31" }
      ],
      columns: [
        { key: "user_id", label: "User ID", type: "string", sortable: true },
        { key: "unique_devices", label: "Unique Devices", type: "number", sortable: true },
        { key: "total_sessions", label: "Total Sessions", type: "number", sortable: true },
        { key: "avg_session_duration", label: "Avg Session Duration", type: "string", sortable: false },
        { key: "first_seen", label: "First Seen", type: "date", sortable: true },
        { key: "last_seen", label: "Last Seen", type: "date", sortable: true }
      ]
    }
  }
];

export const mockFieldMappings = [
  { category: "payment", fields: ["amount", "currency", "merchant_id", "status", "payment_method"] },
  { category: "user", fields: ["user_id", "email", "account_type", "registration_date", "last_login"] },
  { category: "device", fields: ["device_id", "ip_address", "user_agent", "screen_resolution", "timezone"] },
  { category: "location", fields: ["country", "city", "latitude", "longitude", "isp"] },
  { category: "fraud", fields: ["risk_score", "fraud_type", "detection_method", "confidence", "alert_time"] }
];

export const mockRexPatterns = [
  { field_name: "transaction_id", pattern: "TXN_\\d{10,12}" },
  { field_name: "user_email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" },
  { field_name: "ip_address", pattern: "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b" },
  { field_name: "credit_card", pattern: "\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b" }
];

export const mockEvalCommands = [
  { command: "eval risk_level=case(risk_score>0.8,\"high\",risk_score>0.5,\"medium\",1=1,\"low\")" },
  { command: "eval time_category=case(hour>=9 AND hour<=17,\"business\",hour>=18 AND hour<=23,\"evening\",1=1,\"night\")" },
  { command: "eval amount_category=case(amount>10000,\"high_value\",amount>1000,\"medium_value\",1=1,\"low_value\")" }
];

export const mockPreparedPrompts = [
  // Payment & Transaction Analysis
  {
    id: "prompt_001",
    title: "Failed Payment Analysis",
    description: "Analyze failed payment transactions with breakdown by merchant and reason",
    category: "payments",
    template: "Show me all failed payment transactions in the last 24 hours with breakdown by merchant and failure reason",
    variables: [],
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: "prompt_002",
    title: "High-Value Transaction Monitoring",
    description: "Monitor transactions above certain thresholds for fraud patterns",
    category: "payments",
    template: "Find all transactions above $10,000 in the last 7 days with risk analysis",
    variables: [],
    created_at: "2024-01-18T11:45:00Z"
  },
  {
    id: "prompt_003",
    title: "Chargeback Analysis",
    description: "Identify patterns in chargeback disputes and merchant vulnerabilities",
    category: "payments",
    template: "Show me all chargeback disputes in the last 30 days grouped by merchant and reason code",
    variables: [],
    created_at: "2024-01-20T09:30:00Z"
  },
  {
    id: "prompt_004",
    title: "Payment Method Fraud",
    description: "Detect unusual payment method usage patterns",
    category: "payments",
    template: "Find users who have switched between more than 3 different payment methods in the last 14 days",
    variables: [],
    created_at: "2024-01-22T14:15:00Z"
  },

  // Security & Authentication
  {
    id: "prompt_005", 
    title: "Suspicious Login Detection",
    description: "Find users with rapid location changes indicating potential account compromise",
    category: "security",
    template: "Find users with login attempts from different countries within 30 minutes",
    variables: [],
    created_at: "2024-01-16T14:20:00Z"
  },
  {
    id: "prompt_006",
    title: "Failed Login Attempts",
    description: "Identify brute force attacks and credential stuffing attempts",
    category: "security",
    template: "Show me users with more than 10 failed login attempts in the last hour",
    variables: [],
    created_at: "2024-01-19T08:45:00Z"
  },
  {
    id: "prompt_007",
    title: "Account Takeover Indicators",
    description: "Detect signs of account takeover through behavioral changes",
    category: "security",
    template: "Find accounts with sudden changes in email, phone, or address within 24 hours of login from new location",
    variables: [],
    created_at: "2024-01-21T16:30:00Z"
  },
  {
    id: "prompt_008",
    title: "Privilege Escalation",
    description: "Monitor for unauthorized privilege changes",
    category: "security",
    template: "Show me all user privilege changes in the last 7 days with timestamps and admin who made the change",
    variables: [],
    created_at: "2024-01-23T10:20:00Z"
  },

  // Device & Network Analysis
  {
    id: "prompt_009",
    title: "Device Fingerprint Anomalies",
    description: "Identify users with unusual device diversity patterns",
    category: "device",
    template: "Show users with more than 5 unique device signatures in the last 30 days",
    variables: [],
    created_at: "2024-01-17T09:15:00Z"
  },
  {
    id: "prompt_010",
    title: "VPN/Proxy Detection",
    description: "Find users accessing through VPNs or proxy services",
    category: "device",
    template: "Identify users with IP addresses flagged as VPN, proxy, or TOR exit nodes in the last 24 hours",
    variables: [],
    created_at: "2024-01-24T13:45:00Z"
  },
  {
    id: "prompt_011",
    title: "Shared Device Usage",
    description: "Detect devices being used by multiple accounts",
    category: "device",
    template: "Find device fingerprints used by more than 3 different user accounts in the last 14 days",
    variables: [],
    created_at: "2024-01-25T11:30:00Z"
  },
  {
    id: "prompt_012",
    title: "Geolocation Inconsistencies",
    description: "Find impossible travel patterns based on geolocation data",
    category: "device",
    template: "Show users with login locations more than 1000 miles apart within 2 hours",
    variables: [],
    created_at: "2024-01-26T15:10:00Z"
  },

  // Fraud Detection & Risk
  {
    id: "prompt_013",
    title: "Risk Score Anomalies",
    description: "Identify users with sudden risk score increases",
    category: "fraud",
    template: "Find users whose risk score increased by more than 0.3 points in the last 7 days",
    variables: [],
    created_at: "2024-01-27T09:45:00Z"
  },
  {
    id: "prompt_014",
    title: "Velocity Fraud Detection",
    description: "Detect rapid-fire transactions indicating fraud",
    category: "fraud",
    template: "Show users with more than 5 transactions within 10 minutes in the last 24 hours",
    variables: [],
    created_at: "2024-01-28T12:20:00Z"
  },
  {
    id: "prompt_015",
    title: "Identity Verification Failures",
    description: "Monitor identity verification failures and patterns",
    category: "fraud",
    template: "Find users with 3 or more identity verification failures in the last 30 days",
    variables: [],
    created_at: "2024-01-29T16:15:00Z"
  },
  {
    id: "prompt_016",
    title: "Synthetic Identity Detection",
    description: "Identify potential synthetic identities through data patterns",
    category: "fraud",
    template: "Show accounts created with SSNs that appear in multiple applications with different names",
    variables: [],
    created_at: "2024-01-30T10:30:00Z"
  },

  // Behavioral Analysis
  {
    id: "prompt_017",
    title: "Unusual Activity Patterns",
    description: "Detect deviation from normal user behavior",
    category: "behavior",
    template: "Find users whose transaction patterns deviate significantly from their 90-day average",
    variables: [],
    created_at: "2024-02-01T08:45:00Z"
  },
  {
    id: "prompt_018",
    title: "Dormant Account Reactivation",
    description: "Monitor previously inactive accounts for suspicious reactivation",
    category: "behavior",
    template: "Show accounts inactive for more than 180 days that suddenly became active in the last 7 days",
    variables: [],
    created_at: "2024-02-02T14:30:00Z"
  },
  {
    id: "prompt_019",
    title: "Time-Based Anomalies",
    description: "Detect unusual activity outside normal business hours",
    category: "behavior",
    template: "Find transactions occurring between 2 AM and 6 AM local time in the last 14 days",
    variables: [],
    created_at: "2024-02-03T11:15:00Z"
  },
  {
    id: "prompt_020",
    title: "Multiple Account Linking",
    description: "Identify users potentially operating multiple accounts",
    category: "behavior",
    template: "Show users with accounts sharing phone numbers, addresses, or device fingerprints",
    variables: [],
    created_at: "2024-02-04T13:45:00Z"
  },

  // Compliance & Reporting
  {
    id: "prompt_021",
    title: "AML Suspicious Activity",
    description: "Generate anti-money laundering reports for suspicious patterns",
    category: "compliance",
    template: "Find users with cash transactions over $10,000 or structured transactions just below reporting thresholds",
    variables: [],
    created_at: "2024-02-05T09:30:00Z"
  },
  {
    id: "prompt_022",
    title: "KYC Compliance Review",
    description: "Review Know Your Customer compliance status",
    category: "compliance",
    template: "Show users with incomplete KYC documentation or expired verification documents",
    variables: [],
    created_at: "2024-02-06T15:20:00Z"
  },
  {
    id: "prompt_023",
    title: "Regulatory Reporting",
    description: "Generate regulatory compliance reports",
    category: "compliance",
    template: "Create a summary of all flagged transactions requiring regulatory reporting in the last 30 days",
    variables: [],
    created_at: "2024-02-07T10:45:00Z"
  },
  {
    id: "prompt_024",
    title: "PII Exposure Analysis",
    description: "Detect potential personally identifiable information exposure",
    category: "compliance",
    template: "Find instances where PII might have been logged or exposed in system logs or error messages",
    variables: [],
    created_at: "2024-02-08T12:30:00Z"
  },

  // Advanced Fraud Investigation Prompts
  {
    id: "prompt_025",
    title: "Transaction Velocity Analysis",
    description: "Analyze transaction patterns for velocity-based fraud",
    category: "fraud",
    template: "Analyze transaction velocity for {user_id} - check for rapid transactions, escalating amounts, and card testing patterns",
    variables: ["user_id"],
    created_at: "2024-02-10T10:30:00Z"
  },
  {
    id: "prompt_026",
    title: "Money Laundering Detection",
    description: "Detect potential money laundering activities",
    category: "aml",
    template: "Find accounts with structured deposits under $10,000, rapid transfers between accounts, and circular money movement patterns",
    variables: [],
    created_at: "2024-02-11T11:45:00Z"
  },
  {
    id: "prompt_027",
    title: "Account Takeover Investigation",
    description: "Comprehensive ATO detection across multiple signals",
    category: "fraud",
    template: "Investigate potential account takeover for {user_id} - check login anomalies, device changes, security setting modifications, and transaction patterns",
    variables: ["user_id"],
    created_at: "2024-02-12T09:15:00Z"
  },
  {
    id: "prompt_028",
    title: "Fraud Ring Network Analysis",
    description: "Identify connected fraudulent accounts",
    category: "fraud",
    template: "Map fraud ring connections - find accounts sharing devices, IP addresses, payment methods, or addresses with known fraudulent account {account_id}",
    variables: ["account_id"],
    created_at: "2024-02-13T14:20:00Z"
  },
  {
    id: "prompt_029",
    title: "Sanctions Screening Alert",
    description: "Check entities against sanctions lists",
    category: "compliance",
    template: "Screen {entity_name} against OFAC, EU, UN sanctions lists and PEP databases - include fuzzy matching and known aliases",
    variables: ["entity_name"],
    created_at: "2024-02-14T16:00:00Z"
  },
  {
    id: "prompt_030",
    title: "Merchant Category Risk Analysis",
    description: "Analyze high-risk merchant transactions",
    category: "fraud",
    template: "Find all transactions to high-risk merchant categories (cryptocurrency, gambling, money transfer services) for accounts created in last {days} days",
    variables: ["days"],
    created_at: "2024-02-15T11:30:00Z"
  },
  {
    id: "prompt_031",
    title: "Digital Footprint Verification",
    description: "Verify user's digital presence and authenticity",
    category: "fraud",
    template: "Analyze digital footprint for {email} - check email age, social media presence, data breach involvement, and online reputation",
    variables: ["email"],
    created_at: "2024-02-16T13:45:00Z"
  },
  {
    id: "prompt_032",
    title: "Synthetic Identity Detection",
    description: "Identify potential synthetic identities",
    category: "fraud",
    template: "Find accounts with SSN issued after 2011, minimal credit history, rapid credit building, and multiple applications with slight variations",
    variables: [],
    created_at: "2024-02-17T10:00:00Z"
  },
  {
    id: "prompt_033",
    title: "Real-time Fraud Score",
    description: "Calculate comprehensive fraud risk score",
    category: "fraud",
    template: "Calculate real-time fraud risk score for transaction {transaction_id} - include ML model predictions, rule-based checks, and historical patterns",
    variables: ["transaction_id"],
    created_at: "2024-02-18T15:30:00Z"
  },
  {
    id: "prompt_034",
    title: "Cryptocurrency Fraud Detection",
    description: "Detect cryptocurrency-related fraud patterns",
    category: "fraud",
    template: "Analyze crypto transactions for wallet {wallet_address} - check for mixing services, known scam addresses, and unusual transaction patterns",
    variables: ["wallet_address"],
    created_at: "2024-02-19T12:15:00Z"
  }
];

// Function to get a random demo response based on query
export const getRandomDemoResponse = (naturalQuery) => {
  // If query matches known patterns, return specific response
  const lowerQuery = naturalQuery.toLowerCase();
  
  // Handle the elaborate multi-vector fraud analysis prompt
  if (lowerQuery.includes('multi-vector') || lowerQuery.includes('high-risk user accounts') || lowerQuery.includes('investigation criteria')) {
    return {
      natural_query: naturalQuery,
      translated_query: "search index=fraud_analytics risk_score>0.7 | join type=left user_id [search index=device_logs | stats dc(device_id) as device_count, dc(src_ip) as ip_count, values(country) as countries by user_id] | join type=left user_id [search index=transactions amount>5000] | join type=left user_id [search index=identity_verification status=failed] | eval geo_risk=if(mvcount(countries)>2,\"high\",\"medium\") | stats count as total_events, avg(amount) as avg_transaction, max(risk_score) as max_risk, dc(country) as country_count by user_id, age_group, account_type | where total_events>10 | sort -max_risk",
      response: "🚨 **COMPREHENSIVE FRAUD ANALYSIS COMPLETE** 🚨\n\nAnalyzed 2,847 high-risk user accounts across multiple fraud vectors. Identified 156 critical cases requiring immediate intervention.\n\n**EXECUTIVE SUMMARY:**\n- **Critical Risk Users:** 47 accounts with risk scores 0.85-0.98\n- **Geographic Anomalies:** 89 accounts with impossible travel patterns\n- **Financial Impact:** $12.3M in suspicious transactions flagged\n- **Identity Failures:** 234 failed verification attempts across 156 accounts\n\n**TOP RISK INDICATORS:**\n✓ Multi-country logins within 24 hours\n✓ Rapid device switching patterns\n✓ High-value transactions outside normal behavior\n✓ Multiple identity verification failures\n✓ Shared device fingerprints across accounts\n\n**RECOMMENDED ACTIONS:**\n1. **Immediate Account Suspension:** 47 critical risk accounts\n2. **Enhanced Monitoring:** 109 medium-risk accounts\n3. **Identity Re-verification:** All flagged accounts\n4. **Transaction Review:** $12.3M in suspicious activity\n\nData sources: fraud_analytics, device_logs, transactions, identity_verification, geolocation_data",
      execution_time: 3.7,
      result_count: 156,
      sources: ["fraud_analytics", "device_logs", "transactions", "identity_verification", "geolocation_data"],
      confidence: 0.94,
      structured_data: {
        data: [
          { 
            user_id: "USR_FR_8901", 
            risk_score: 0.98, 
            age_group: "25-34", 
            account_type: "Premium", 
            device_count: 12, 
            country_count: 7, 
            countries: ["US", "Russia", "Nigeria", "Brazil", "India", "Germany", "UK"],
            total_transactions: 23, 
            total_amount: 45780.50, 
            avg_transaction: 1990.89,
            failed_verifications: 8,
            last_activity: "2024-02-08T14:23:00Z",
            geo_risk: "CRITICAL",
            device_risk: "HIGH",
            financial_risk: "HIGH",
            recommendation: "IMMEDIATE_SUSPENSION"
          },
          { 
            user_id: "USR_FR_7234", 
            risk_score: 0.95, 
            age_group: "35-44", 
            account_type: "Business", 
            device_count: 8, 
            country_count: 5, 
            countries: ["US", "China", "Mexico", "Canada", "Netherlands"],
            total_transactions: 31, 
            total_amount: 78920.75, 
            avg_transaction: 2545.83,
            failed_verifications: 5,
            last_activity: "2024-02-08T16:45:00Z",
            geo_risk: "HIGH",
            device_risk: "HIGH",
            financial_risk: "CRITICAL",
            recommendation: "IMMEDIATE_SUSPENSION"
          },
          { 
            user_id: "USR_FR_5567", 
            risk_score: 0.92, 
            age_group: "18-24", 
            account_type: "Standard", 
            device_count: 15, 
            country_count: 9, 
            countries: ["US", "UK", "France", "Spain", "Italy", "Poland", "Romania", "Turkey", "UAE"],
            total_transactions: 67, 
            total_amount: 234560.25, 
            avg_transaction: 3501.64,
            failed_verifications: 12,
            last_activity: "2024-02-08T18:12:00Z",
            geo_risk: "CRITICAL",
            device_risk: "CRITICAL",
            financial_risk: "CRITICAL",
            recommendation: "IMMEDIATE_SUSPENSION"
          },
          { 
            user_id: "USR_FR_3421", 
            risk_score: 0.89, 
            age_group: "45-54", 
            account_type: "Premium", 
            device_count: 6, 
            country_count: 4, 
            countries: ["US", "Canada", "Australia", "Singapore"],
            total_transactions: 18, 
            total_amount: 125670.00, 
            avg_transaction: 6981.67,
            failed_verifications: 3,
            last_activity: "2024-02-08T12:34:00Z",
            geo_risk: "MEDIUM",
            device_risk: "MEDIUM",
            financial_risk: "HIGH",
            recommendation: "ENHANCED_MONITORING"
          },
          { 
            user_id: "USR_FR_9876", 
            risk_score: 0.87, 
            age_group: "25-34", 
            account_type: "Business", 
            device_count: 9, 
            country_count: 6, 
            countries: ["US", "UK", "Germany", "Japan", "South Korea", "Thailand"],
            total_transactions: 42, 
            total_amount: 189430.80, 
            avg_transaction: 4510.02,
            failed_verifications: 7,
            last_activity: "2024-02-08T20:15:00Z",
            geo_risk: "HIGH",
            device_risk: "HIGH",
            financial_risk: "HIGH",
            recommendation: "IMMEDIATE_SUSPENSION"
          },
          { 
            user_id: "USR_FR_6543", 
            risk_score: 0.85, 
            age_group: "35-44", 
            account_type: "Standard", 
            device_count: 4, 
            country_count: 3, 
            countries: ["US", "Mexico", "Costa Rica"],
            total_transactions: 14, 
            total_amount: 67820.40, 
            avg_transaction: 4844.31,
            failed_verifications: 2,
            last_activity: "2024-02-08T11:28:00Z",
            geo_risk: "MEDIUM",
            device_risk: "LOW",
            financial_risk: "MEDIUM",
            recommendation: "ENHANCED_MONITORING"
          },
          { 
            user_id: "USR_FR_2109", 
            risk_score: 0.83, 
            age_group: "55-64", 
            account_type: "Premium", 
            device_count: 7, 
            country_count: 4, 
            countries: ["US", "UK", "Ireland", "France"],
            total_transactions: 29, 
            total_amount: 156789.90, 
            avg_transaction: 5406.55,
            failed_verifications: 4,
            last_activity: "2024-02-08T15:42:00Z",
            geo_risk: "MEDIUM",
            device_risk: "MEDIUM",
            financial_risk: "HIGH",
            recommendation: "ENHANCED_MONITORING"
          },
          { 
            user_id: "USR_FR_8765", 
            risk_score: 0.81, 
            age_group: "25-34", 
            account_type: "Business", 
            device_count: 11, 
            country_count: 5, 
            countries: ["US", "Canada", "Brazil", "Argentina", "Chile"],
            total_transactions: 36, 
            total_amount: 98760.25, 
            avg_transaction: 2743.34,
            failed_verifications: 6,
            last_activity: "2024-02-08T17:19:00Z",
            geo_risk: "HIGH",
            device_risk: "HIGH",
            financial_risk: "MEDIUM",
            recommendation: "ENHANCED_MONITORING"
          }
        ],
        columns: [
          { key: "user_id", label: "User ID", type: "string", sortable: true },
          { key: "risk_score", label: "Risk Score", type: "number", sortable: true },
          { key: "age_group", label: "Age Group", type: "string", sortable: true },
          { key: "account_type", label: "Account Type", type: "string", sortable: true },
          { key: "device_count", label: "Device Count", type: "number", sortable: true },
          { key: "country_count", label: "Country Count", type: "number", sortable: true },
          { key: "countries", label: "Countries", type: "string", sortable: false },
          { key: "total_transactions", label: "Total Transactions", type: "number", sortable: true },
          { key: "total_amount", label: "Total Amount ($)", type: "number", sortable: true },
          { key: "avg_transaction", label: "Avg Transaction ($)", type: "number", sortable: true },
          { key: "failed_verifications", label: "Failed Verifications", type: "number", sortable: true },
          { key: "last_activity", label: "Last Activity", type: "date", sortable: true },
          { key: "geo_risk", label: "Geo Risk", type: "string", sortable: true },
          { key: "device_risk", label: "Device Risk", type: "string", sortable: true },
          { key: "financial_risk", label: "Financial Risk", type: "string", sortable: true },
          { key: "recommendation", label: "Recommendation", type: "string", sortable: true }
        ]
      }
    };
  }
  
  if (lowerQuery.includes('payment') || lowerQuery.includes('transaction')) {
    return mockRAGResponses[0];
  } else if (lowerQuery.includes('login') || lowerQuery.includes('suspicious') || lowerQuery.includes('user')) {
    return mockRAGResponses[1];
  } else if (lowerQuery.includes('device') || lowerQuery.includes('fingerprint') || lowerQuery.includes('fraud')) {
    return mockRAGResponses[2];
  }
  
  // Return a random response for other queries
  return mockRAGResponses[Math.floor(Math.random() * mockRAGResponses.length)];
}; 