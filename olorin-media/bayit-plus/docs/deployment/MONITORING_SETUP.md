# Beta 500 Monitoring Setup

**Purpose**: Comprehensive monitoring, alerting, and observability for Beta 500 program

**Last Updated**: 2026-01-29
**Owner**: Platform Team
**Related**: [Beta 500 Plan](../../BETA_500_REVISED_PLAN.md)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     BAYIT+ APPLICATION                            │
│                                                                   │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐ │
│  │   Backend      │    │   Frontend     │    │   Database     │ │
│  │   Metrics      │    │   RUM          │    │   Metrics      │ │
│  └────────┬───────┘    └────────┬───────┘    └────────┬───────┘ │
│           │                     │                     │          │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            ▼                     ▼                     ▼
      ┌─────────────────────────────────────────────────────┐
      │            PROMETHEUS (Metrics Collection)          │
      │  - Application metrics (credits, sessions)          │
      │  - System metrics (CPU, memory, disk)               │
      │  - Database metrics (queries, connections)          │
      │  - Custom Beta 500 business metrics                 │
      └──────────────────────┬──────────────────────────────┘
                             │
                             ▼
      ┌─────────────────────────────────────────────────────┐
      │              GRAFANA (Visualization)                │
      │  - Real-time dashboards                            │
      │  - Beta 500 analytics                              │
      │  - Alert management                                │
      └──────────────────────┬──────────────────────────────┘
                             │
                             ▼
      ┌─────────────────────────────────────────────────────┐
      │          ALERTMANAGER (Alert Routing)              │
      │  - Slack notifications                             │
      │  - PagerDuty integration                           │
      │  - Email alerts                                    │
      └─────────────────────────────────────────────────────┘
```

---

## 1. Prometheus Setup

### 1.1 Installation (Docker Compose)

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    networks:
      - monitoring
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=https://monitoring.bayitplus.com
    ports:
      - "3000:3000"
    networks:
      - monitoring
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    volumes:
      - ./monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    ports:
      - "9093:9093"
    networks:
      - monitoring
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    command:
      - '--path.rootfs=/host'
    volumes:
      - '/:/host:ro,rslave'
    ports:
      - "9100:9100"
    networks:
      - monitoring
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
```

### 1.2 Prometheus Configuration

```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'bayit-plus-production'
    env: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

# Load alert rules
rule_files:
  - 'alerts.yml'

# Scrape configurations
scrape_configs:
  # Backend application metrics
  - job_name: 'bayit-plus-backend'
    static_configs:
      - targets: ['backend:8090']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # Frontend application metrics
  - job_name: 'bayit-plus-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  # Node exporter (system metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # MongoDB exporter
  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### 1.3 Alert Rules

```yaml
# monitoring/prometheus/alerts.yml
groups:
  - name: beta_500_alerts
    interval: 30s
    rules:
      # Critical: Beta user limit reached
      - alert: BetaUserLimitReached
        expr: beta_active_users >= 500
        for: 5m
        labels:
          severity: critical
          feature: beta-500
        annotations:
          summary: "Beta 500 user limit reached"
          description: "Active beta users ({{ $value }}) has reached the 500 user limit. New signups will be blocked."

      # Critical: High credit depletion rate
      - alert: HighCreditDepletionRate
        expr: rate(beta_credits_deducted_total[5m]) > 100
        for: 10m
        labels:
          severity: critical
          feature: beta-500
        annotations:
          summary: "Unusually high credit depletion rate"
          description: "Credits are being depleted at {{ $value }} credits/sec (threshold: 100/sec). Possible abuse or bug."

      # High: Low credit balance warnings
      - alert: ManyUsersLowCredits
        expr: count(beta_user_remaining_credits < 500) > 50
        for: 15m
        labels:
          severity: high
          feature: beta-500
        annotations:
          summary: "Many users have low credit balances"
          description: "{{ $value }} users have less than 500 credits remaining. Consider sending refill notifications."

      # High: Session timeout rate
      - alert: HighSessionTimeoutRate
        expr: rate(beta_sessions_timeout_total[10m]) > 0.1
        for: 15m
        labels:
          severity: high
          feature: beta-500
        annotations:
          summary: "High session timeout rate"
          description: "Session timeout rate is {{ $value }}/sec. Users may be experiencing connectivity issues."

      # High: Transaction failure rate
      - alert: HighTransactionFailureRate
        expr: rate(beta_credit_transaction_errors_total[5m]) > 0.05
        for: 10m
        labels:
          severity: high
          feature: beta-500
        annotations:
          summary: "High credit transaction failure rate"
          description: "Credit transaction failures at {{ $value }}/sec. Database or race condition issues likely."

      # Medium: Email verification backlog
      - alert: EmailVerificationBacklog
        expr: beta_unverified_users > 20
        for: 30m
        labels:
          severity: medium
          feature: beta-500
        annotations:
          summary: "Email verification backlog"
          description: "{{ $value }} users have not verified emails after 30 minutes."

      # Medium: Credit checkpoint lag
      - alert: CheckpointLagHigh
        expr: beta_checkpoint_lag_seconds > 120
        for: 10m
        labels:
          severity: medium
          feature: beta-500
        annotations:
          summary: "Credit checkpoint lag detected"
          description: "Checkpoint lag is {{ $value }}s (threshold: 120s). Background worker may be overloaded."

      # System alerts
      - alert: HighBackendErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
          component: backend
        annotations:
          summary: "High backend error rate"
          description: "Backend 5xx error rate is {{ $value }}/sec."

      - alert: HighMemoryUsage
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
        for: 5m
        labels:
          severity: high
          component: system
        annotations:
          summary: "High memory usage"
          description: "Available memory is below 10% ({{ $value }})."

      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: high
          component: system
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is above 80% ({{ $value }}%)."

      - alert: DatabaseConnectionPoolExhaustion
        expr: mongodb_connections_current / mongodb_connections_available > 0.9
        for: 5m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "MongoDB connection pool usage is at {{ $value }}%."
```

---

## 2. Grafana Dashboards

### 2.1 Beta 500 Overview Dashboard

**Panels**:

1. **Active Beta Users** (Gauge)
   ```promql
   beta_active_users
   ```

2. **Total Credits Allocated** (Stat)
   ```promql
   sum(beta_user_total_credits)
   ```

3. **Total Credits Used** (Stat)
   ```promql
   sum(beta_user_used_credits)
   ```

4. **Credit Usage Rate** (Graph)
   ```promql
   rate(beta_credits_deducted_total[5m])
   ```

5. **Credits by Feature** (Pie Chart)
   ```promql
   sum by (feature) (beta_credits_deducted_total)
   ```

6. **Active Dubbing Sessions** (Gauge)
   ```promql
   beta_active_sessions{status="active"}
   ```

7. **Session Duration** (Histogram)
   ```promql
   histogram_quantile(0.95, beta_session_duration_seconds_bucket)
   ```

8. **Credit Depletion Timeline** (Graph)
   ```promql
   avg(beta_user_remaining_credits)
   ```

9. **Users by Credit Tier** (Bar Chart)
   ```promql
   count(beta_user_remaining_credits >= 4000) # High
   count(beta_user_remaining_credits >= 1000 and beta_user_remaining_credits < 4000) # Medium
   count(beta_user_remaining_credits < 1000) # Low
   ```

10. **Verification Status** (Stat)
    ```promql
    beta_verified_users
    beta_unverified_users
    ```

### 2.2 System Health Dashboard

**Panels**:

1. **HTTP Request Rate** (Graph)
   ```promql
   rate(http_requests_total[5m])
   ```

2. **HTTP Error Rate** (Graph)
   ```promql
   rate(http_requests_total{status=~"5.."}[5m])
   ```

3. **Request Duration** (Graph)
   ```promql
   histogram_quantile(0.95, http_request_duration_seconds_bucket)
   ```

4. **Memory Usage** (Graph)
   ```promql
   node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes
   ```

5. **CPU Usage** (Graph)
   ```promql
   100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
   ```

6. **Database Connections** (Graph)
   ```promql
   mongodb_connections_current
   mongodb_connections_available
   ```

---

## 3. Alertmanager Configuration

```yaml
# monitoring/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: ${SLACK_WEBHOOK_URL}

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-critical'

  # Route alerts based on severity
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true

    - match:
        severity: critical
      receiver: 'slack-critical'

    - match:
        severity: high
      receiver: 'slack-high'

    - match:
        severity: medium
      receiver: 'slack-medium'

receivers:
  # PagerDuty for critical alerts
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: ${PAGERDUTY_SERVICE_KEY}
        severity: 'critical'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'

  # Slack for critical alerts
  - name: 'slack-critical'
    slack_configs:
      - channel: '#beta-500-critical'
        username: 'Bayit+ Alerts'
        icon_emoji: ':rotating_light:'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Severity:* {{ .Labels.severity }}
          *Started:* {{ .StartsAt }}
          {{ end }}
        actions:
          - type: button
            text: 'View in Grafana'
            url: 'https://monitoring.bayitplus.com'

  # Slack for high priority alerts
  - name: 'slack-high'
    slack_configs:
      - channel: '#beta-500-alerts'
        username: 'Bayit+ Alerts'
        icon_emoji: ':warning:'
        title: '⚠️ HIGH: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          {{ end }}

  # Slack for medium priority alerts
  - name: 'slack-medium'
    slack_configs:
      - channel: '#beta-500-monitoring'
        username: 'Bayit+ Monitoring'
        icon_emoji: ':information_source:'
        title: 'ℹ️ MEDIUM: {{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'

inhibit_rules:
  # Inhibit medium alerts if critical alert for same component
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'medium'
    equal: ['alertname', 'feature']

  # Inhibit high alerts if critical alert
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'high'
    equal: ['alertname']
```

---

## 4. Deployment

### 4.1 Local Development

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access UIs
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin / ${GRAFANA_ADMIN_PASSWORD})
# Alertmanager: http://localhost:9093

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 4.2 Production Deployment (Google Cloud)

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --set grafana.adminPassword=${GRAFANA_ADMIN_PASSWORD} \
  --set alertmanager.config.global.slack_api_url=${SLACK_WEBHOOK_URL}

# Apply Beta 500 custom metrics and dashboards
kubectl apply -f monitoring/prometheus/servicemonitor.yaml
kubectl apply -f monitoring/grafana/dashboards/
```

---

## 5. Custom Metrics Implementation

See `backend/app/core/metrics.py` for full implementation. Key metrics:

```python
# Beta 500 business metrics
beta_active_users = Gauge('beta_active_users', 'Number of active beta users')
beta_credits_deducted_total = Counter('beta_credits_deducted_total', 'Total credits deducted', ['feature'])
beta_user_remaining_credits = Gauge('beta_user_remaining_credits', 'Remaining credits per user', ['user_id'])
beta_active_sessions = Gauge('beta_active_sessions', 'Active dubbing sessions', ['status'])
beta_session_duration_seconds = Histogram('beta_session_duration_seconds', 'Session duration distribution')
beta_credit_transaction_errors_total = Counter('beta_credit_transaction_errors_total', 'Credit transaction errors', ['error_type'])
```

---

## 6. Verification Checklist

After setup, verify:

- [ ] Prometheus scraping all targets successfully
- [ ] Grafana dashboards displaying Beta 500 metrics
- [ ] Alertmanager receiving test alerts
- [ ] Slack notifications working for all severity levels
- [ ] PagerDuty integration active for critical alerts
- [ ] Metrics retention set to 30 days
- [ ] All alert rules loading without errors
- [ ] Dashboard auto-refresh enabled
- [ ] User access controls configured in Grafana
- [ ] SSL/TLS enabled for production endpoints

---

## 7. Maintenance

### 7.1 Weekly Tasks
- Review alert noise and adjust thresholds
- Check disk usage for Prometheus data
- Verify backup integrity

### 7.2 Monthly Tasks
- Review and update dashboards based on usage
- Rotate Grafana admin password
- Audit alert routing rules
- Review metric cardinality

### 7.3 Quarterly Tasks
- Update Prometheus/Grafana versions
- Review retention policies
- Conduct disaster recovery drill
- Optimize slow queries

---

## 8. Troubleshooting

### Prometheus not scraping
```bash
# Check targets
curl http://localhost:9090/api/v1/targets

# Check service discovery
curl http://localhost:9090/api/v1/targets/metadata

# Restart Prometheus
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Grafana dashboard not loading
```bash
# Check Grafana logs
docker logs grafana

# Verify data source
curl -u admin:${GRAFANA_ADMIN_PASSWORD} http://localhost:3000/api/datasources

# Re-provision dashboards
docker-compose -f docker-compose.monitoring.yml restart grafana
```

### Alerts not firing
```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Check Alertmanager status
curl http://localhost:9093/api/v1/status

# Test alert
curl -X POST http://localhost:9093/api/v1/alerts -d '[{"labels":{"alertname":"test"}}]'
```

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Backend Metrics Implementation](../../backend/app/core/metrics.py)
- [Beta 500 Plan](../../BETA_500_REVISED_PLAN.md)
