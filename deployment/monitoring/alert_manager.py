#!/usr/bin/env python3
"""
Intelligent Alert Manager for Olorin Platform.

Provides multi-channel alerting, intelligent filtering, escalation rules,
and deployment failure detection with configurable thresholds.
"""

import asyncio
import aiohttp
import smtplib
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertChannel(Enum):
    """Alert delivery channels."""
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    SMS = "sms"


class AlertStatus(Enum):
    """Alert status states."""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


@dataclass
class AlertRule:
    """Configuration for alert rules."""
    name: str
    condition: str
    severity: AlertSeverity
    channels: List[AlertChannel]
    throttle_minutes: int = 15
    escalation_minutes: int = 60
    enabled: bool = True


@dataclass
class Alert:
    """Alert instance with metadata."""
    alert_id: str
    rule_name: str
    deployment_id: str
    severity: AlertSeverity
    title: str
    message: str
    timestamp: datetime
    status: AlertStatus = AlertStatus.PENDING
    channels_sent: List[AlertChannel] = None
    acknowledgements: Dict[str, datetime] = None
    resolution_time: Optional[datetime] = None
    
    def __post_init__(self):
        if self.channels_sent is None:
            self.channels_sent = []
        if self.acknowledgements is None:
            self.acknowledgements = {}


class AlertManager:
    """
    Intelligent alert manager with multi-channel delivery and escalation.
    
    Manages alert rules, filtering, throttling, and multi-channel delivery
    with intelligent escalation based on deployment context.
    """
    
    def __init__(self):
        # Alert configuration
        self.alert_rules = self._load_default_alert_rules()
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        
        # Channel configuration
        self.channel_config = {
            AlertChannel.EMAIL: {
                "enabled": True,
                "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
                "smtp_port": int(os.getenv("SMTP_PORT", "587")),
                "username": os.getenv("SMTP_USERNAME"),
                "password": os.getenv("SMTP_PASSWORD"),
                "from_email": os.getenv("ALERT_FROM_EMAIL", "alerts@olorin.ai"),
                "to_emails": os.getenv("ALERT_TO_EMAILS", "").split(",")
            },
            AlertChannel.SLACK: {
                "enabled": bool(os.getenv("SLACK_WEBHOOK_URL")),
                "webhook_url": os.getenv("SLACK_WEBHOOK_URL"),
                "channel": os.getenv("SLACK_CHANNEL", "#deployments")
            },
            AlertChannel.WEBHOOK: {
                "enabled": bool(os.getenv("ALERT_WEBHOOK_URL")),
                "webhook_url": os.getenv("ALERT_WEBHOOK_URL"),
                "headers": {"Content-Type": "application/json"}
            }
        }
        
        # Throttling and escalation tracking
        self.alert_throttle: Dict[str, datetime] = {}
        self.escalation_tasks: Dict[str, asyncio.Task] = {}
    
    async def evaluate_deployment_alerts(
        self,
        deployment_id: str,
        deployment_status: str,
        service_statuses: Dict[str, str],
        metrics: Optional[Dict[str, Any]] = None
    ):
        """
        Evaluate deployment state against alert rules.
        
        Args:
            deployment_id: Unique identifier for the deployment
            deployment_status: Overall deployment status
            service_statuses: Status of individual services
            metrics: Performance metrics
        """
        context = {
            "deployment_id": deployment_id,
            "deployment_status": deployment_status,
            "service_statuses": service_statuses,
            "metrics": metrics or {},
            "timestamp": datetime.now(timezone.utc)
        }
        
        for rule in self.alert_rules.values():
            if not rule.enabled:
                continue
            
            try:
                if await self._evaluate_alert_condition(rule, context):
                    await self._trigger_alert(rule, context)
            except Exception as e:
                logger.error(f"Error evaluating alert rule {rule.name}: {e}")
    
    async def trigger_deployment_failure_alert(
        self,
        deployment_id: str,
        error_message: str,
        failed_services: List[str]
    ):
        """
        Trigger immediate alert for deployment failure.
        
        Args:
            deployment_id: Unique identifier for the deployment
            error_message: Error message from deployment
            failed_services: List of services that failed
        """
        alert = Alert(
            alert_id=f"deploy_fail_{deployment_id}_{int(datetime.now().timestamp())}",
            rule_name="deployment_failure",
            deployment_id=deployment_id,
            severity=AlertSeverity.CRITICAL,
            title=f"Deployment Failure: {deployment_id}",
            message=(
                f"Deployment {deployment_id} has failed.\n\n"
                f"Error: {error_message}\n"
                f"Failed Services: {', '.join(failed_services)}\n"
                f"Time: {datetime.now(timezone.utc).isoformat()}"
            ),
            timestamp=datetime.now(timezone.utc)
        )
        
        await self._send_alert(alert, [AlertChannel.EMAIL, AlertChannel.SLACK])
    
    async def trigger_health_check_failure_alert(
        self,
        deployment_id: str,
        service: str,
        health_status: str,
        details: Dict[str, Any]
    ):
        """
        Trigger alert for health check failures.
        
        Args:
            deployment_id: Unique identifier for the deployment
            service: Service with health check failure
            health_status: Health check status
            details: Health check details
        """
        # Check if this is a critical health failure
        if health_status not in ["unhealthy", "degraded"]:
            return
        
        severity = AlertSeverity.CRITICAL if health_status == "unhealthy" else AlertSeverity.WARNING
        
        alert = Alert(
            alert_id=f"health_fail_{service}_{deployment_id}_{int(datetime.now().timestamp())}",
            rule_name="health_check_failure",
            deployment_id=deployment_id,
            severity=severity,
            title=f"Health Check Failure: {service}",
            message=(
                f"Health check failed for service {service} in deployment {deployment_id}.\n\n"
                f"Status: {health_status}\n"
                f"Details: {json.dumps(details, indent=2)}\n"
                f"Time: {datetime.now(timezone.utc).isoformat()}"
            ),
            timestamp=datetime.now(timezone.utc)
        )
        
        channels = [AlertChannel.SLACK] if severity == AlertSeverity.WARNING else [AlertChannel.EMAIL, AlertChannel.SLACK]
        await self._send_alert(alert, channels)
    
    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str = "system"):
        """
        Acknowledge an active alert.
        
        Args:
            alert_id: Unique identifier for the alert
            acknowledged_by: Who acknowledged the alert
        """
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledgements[acknowledged_by] = datetime.now(timezone.utc)
            
            # Cancel escalation if active
            if alert_id in self.escalation_tasks:
                self.escalation_tasks[alert_id].cancel()
                del self.escalation_tasks[alert_id]
            
            logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
    
    async def resolve_alert(self, alert_id: str):
        """
        Resolve an active alert.
        
        Args:
            alert_id: Unique identifier for the alert
        """
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.RESOLVED
            alert.resolution_time = datetime.now(timezone.utc)
            
            # Move to history and remove from active
            self.alert_history.append(alert)
            del self.active_alerts[alert_id]
            
            # Cancel escalation if active
            if alert_id in self.escalation_tasks:
                self.escalation_tasks[alert_id].cancel()
                del self.escalation_tasks[alert_id]
            
            logger.info(f"Alert {alert_id} resolved")
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """
        Get list of active alerts.
        
        Returns:
            List of active alert dictionaries
        """
        return [
            {
                "alert_id": alert.alert_id,
                "rule_name": alert.rule_name,
                "deployment_id": alert.deployment_id,
                "severity": alert.severity.value,
                "title": alert.title,
                "message": alert.message,
                "timestamp": alert.timestamp.isoformat(),
                "status": alert.status.value,
                "channels_sent": [c.value for c in alert.channels_sent]
            }
            for alert in self.active_alerts.values()
        ]
    
    async def _evaluate_alert_condition(self, rule: AlertRule, context: Dict[str, Any]) -> bool:
        """
        Evaluate if alert rule condition is met.
        
        Args:
            rule: Alert rule to evaluate
            context: Deployment context
            
        Returns:
            True if condition is met, False otherwise
        """
        # Simple condition evaluation (can be extended with more complex logic)
        condition = rule.condition.lower()
        
        if "deployment_failed" in condition:
            return context["deployment_status"] == "failed"
        
        if "service_unhealthy" in condition:
            return any(status in ["failed", "unhealthy"] for status in context["service_statuses"].values())
        
        if "high_response_time" in condition:
            metrics = context.get("metrics", {})
            response_time = metrics.get("response_time_ms", 0)
            return response_time > 5000  # 5 second threshold
        
        if "low_memory" in condition:
            metrics = context.get("metrics", {})
            memory_usage = metrics.get("memory_usage_mb", 0)
            return memory_usage > 8000  # 8GB threshold
        
        return False
    
    async def _trigger_alert(self, rule: AlertRule, context: Dict[str, Any]):
        """
        Trigger alert based on rule and context.
        
        Args:
            rule: Alert rule that was triggered
            context: Deployment context
        """
        # Check throttling
        throttle_key = f"{rule.name}_{context['deployment_id']}"
        if throttle_key in self.alert_throttle:
            last_sent = self.alert_throttle[throttle_key]
            if datetime.now(timezone.utc) - last_sent < timedelta(minutes=rule.throttle_minutes):
                return  # Still in throttle period
        
        # Create alert
        alert = Alert(
            alert_id=f"{rule.name}_{context['deployment_id']}_{int(datetime.now().timestamp())}",
            rule_name=rule.name,
            deployment_id=context['deployment_id'],
            severity=rule.severity,
            title=f"Alert: {rule.name}",
            message=self._generate_alert_message(rule, context),
            timestamp=datetime.now(timezone.utc)
        )
        
        # Send alert
        await self._send_alert(alert, rule.channels)
        
        # Update throttling
        self.alert_throttle[throttle_key] = datetime.now(timezone.utc)
        
        # Schedule escalation if configured
        if rule.escalation_minutes > 0:
            self.escalation_tasks[alert.alert_id] = asyncio.create_task(
                self._escalate_alert(alert, rule.escalation_minutes)
            )
    
    async def _send_alert(self, alert: Alert, channels: List[AlertChannel]):
        """
        Send alert through specified channels.
        
        Args:
            alert: Alert to send
            channels: List of channels to use
        """
        self.active_alerts[alert.alert_id] = alert
        
        for channel in channels:
            try:
                if channel == AlertChannel.EMAIL:
                    await self._send_email_alert(alert)
                elif channel == AlertChannel.SLACK:
                    await self._send_slack_alert(alert)
                elif channel == AlertChannel.WEBHOOK:
                    await self._send_webhook_alert(alert)
                
                alert.channels_sent.append(channel)
                alert.status = AlertStatus.SENT
                
            except Exception as e:
                logger.error(f"Failed to send alert {alert.alert_id} via {channel.value}: {e}")
                alert.status = AlertStatus.FAILED
    
    async def _send_email_alert(self, alert: Alert):
        """Send alert via email."""
        config = self.channel_config[AlertChannel.EMAIL]
        if not config["enabled"] or not config["username"]:
            return
        
        msg = MIMEMultipart()
        msg['From'] = config["from_email"]
        msg['To'] = ", ".join(config["to_emails"])
        msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
        
        body = f"""
Deployment Alert

Title: {alert.title}
Severity: {alert.severity.value.upper()}
Deployment ID: {alert.deployment_id}
Time: {alert.timestamp.isoformat()}

Message:
{alert.message}
"""
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(config["smtp_server"], config["smtp_port"])
        server.starttls()
        server.login(config["username"], config["password"])
        server.send_message(msg)
        server.quit()
    
    async def _send_slack_alert(self, alert: Alert):
        """Send alert to Slack."""
        config = self.channel_config[AlertChannel.SLACK]
        if not config["enabled"]:
            return
        
        color_map = {
            AlertSeverity.INFO: "good",
            AlertSeverity.WARNING: "warning", 
            AlertSeverity.ERROR: "danger",
            AlertSeverity.CRITICAL: "danger"
        }
        
        payload = {
            "channel": config["channel"],
            "username": "Olorin Deployment Monitor",
            "attachments": [{
                "color": color_map.get(alert.severity, "warning"),
                "title": alert.title,
                "text": alert.message,
                "fields": [
                    {"title": "Severity", "value": alert.severity.value.upper(), "short": True},
                    {"title": "Deployment ID", "value": alert.deployment_id, "short": True},
                    {"title": "Time", "value": alert.timestamp.isoformat(), "short": False}
                ]
            }]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(config["webhook_url"], json=payload) as response:
                if response.status != 200:
                    raise Exception(f"Slack API returned {response.status}")
    
    async def _send_webhook_alert(self, alert: Alert):
        """Send alert via webhook."""
        config = self.channel_config[AlertChannel.WEBHOOK]
        if not config["enabled"]:
            return
        
        payload = {
            "alert_id": alert.alert_id,
            "rule_name": alert.rule_name,
            "deployment_id": alert.deployment_id,
            "severity": alert.severity.value,
            "title": alert.title,
            "message": alert.message,
            "timestamp": alert.timestamp.isoformat()
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                config["webhook_url"], 
                json=payload, 
                headers=config["headers"]
            ) as response:
                if response.status not in [200, 201, 202]:
                    raise Exception(f"Webhook returned {response.status}")
    
    def _generate_alert_message(self, rule: AlertRule, context: Dict[str, Any]) -> str:
        """Generate alert message from rule and context."""
        return (
            f"Alert rule '{rule.name}' triggered.\n\n"
            f"Deployment: {context['deployment_id']}\n"
            f"Status: {context['deployment_status']}\n"
            f"Service Statuses: {json.dumps(context['service_statuses'], indent=2)}\n"
            f"Time: {context['timestamp'].isoformat()}"
        )
    
    async def _escalate_alert(self, alert: Alert, escalation_minutes: int):
        """Escalate alert after specified time."""
        await asyncio.sleep(escalation_minutes * 60)
        
        if alert.alert_id in self.active_alerts and alert.status != AlertStatus.ACKNOWLEDGED:
            # Escalate by sending to all channels
            await self._send_alert(alert, [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.WEBHOOK])
            logger.info(f"Escalated alert {alert.alert_id}")
    
    def _load_default_alert_rules(self) -> Dict[str, AlertRule]:
        """Load default alert rules."""
        return {
            "deployment_failure": AlertRule(
                name="deployment_failure",
                condition="deployment_failed",
                severity=AlertSeverity.CRITICAL,
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
                throttle_minutes=5
            ),
            "service_health_failure": AlertRule(
                name="service_health_failure", 
                condition="service_unhealthy",
                severity=AlertSeverity.ERROR,
                channels=[AlertChannel.SLACK],
                throttle_minutes=10
            ),
            "high_response_time": AlertRule(
                name="high_response_time",
                condition="high_response_time",
                severity=AlertSeverity.WARNING,
                channels=[AlertChannel.SLACK],
                throttle_minutes=15
            )
        }