#!/usr/bin/env python3
"""
Alert Channel Handlers for Olorin Platform.

Handles multi-channel alert delivery including email, Slack, webhooks, and SMS.
Separated from main alert manager to maintain modularity.
"""

import asyncio
import aiohttp
import smtplib
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

logger = logging.getLogger(__name__)


class AlertChannel(Enum):
    """Alert delivery channels."""
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    SMS = "sms"


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


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
    channels_sent: List[AlertChannel] = None
    
    def __post_init__(self):
        if self.channels_sent is None:
            self.channels_sent = []


class AlertChannelHandler:
    """
    Handles multi-channel alert delivery.
    
    Manages different alert channels with proper error handling,
    formatting, and delivery confirmation.
    """
    
    def __init__(self):
        # Channel configuration from environment variables
        self.channel_config = {
            AlertChannel.EMAIL: {
                "enabled": bool(os.getenv("SMTP_USERNAME")),
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
    
    async def send_alert(self, alert: Alert, channels: List[AlertChannel]) -> Dict[AlertChannel, bool]:
        """
        Send alert through specified channels.
        
        Args:
            alert: Alert to send
            channels: List of channels to use
            
        Returns:
            Dictionary mapping channels to success status
        """
        results = {}
        
        for channel in channels:
            try:
                if channel == AlertChannel.EMAIL:
                    success = await self._send_email_alert(alert)
                elif channel == AlertChannel.SLACK:
                    success = await self._send_slack_alert(alert)
                elif channel == AlertChannel.WEBHOOK:
                    success = await self._send_webhook_alert(alert)
                elif channel == AlertChannel.SMS:
                    success = await self._send_sms_alert(alert)
                else:
                    success = False
                
                results[channel] = success
                
                if success:
                    alert.channels_sent.append(channel)
                    logger.info(f"Alert {alert.alert_id} sent via {channel.value}")
                else:
                    logger.error(f"Failed to send alert {alert.alert_id} via {channel.value}")
                
            except Exception as e:
                logger.error(f"Error sending alert {alert.alert_id} via {channel.value}: {e}")
                results[channel] = False
        
        return results
    
    async def _send_email_alert(self, alert: Alert) -> bool:
        """Send alert via email."""
        config = self.channel_config[AlertChannel.EMAIL]
        if not config["enabled"] or not config["username"]:
            logger.warning("Email alerting not configured")
            return False
        
        try:
            msg = MIMEMultipart()
            msg['From'] = config["from_email"]
            msg['To'] = ", ".join([email for email in config["to_emails"] if email.strip()])
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
            
            body = self._format_email_body(alert)
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(config["smtp_server"], config["smtp_port"])
            server.starttls()
            server.login(config["username"], config["password"])
            server.send_message(msg)
            server.quit()
            
            return True
            
        except Exception as e:
            logger.error(f"Email alert failed: {e}")
            return False
    
    async def _send_slack_alert(self, alert: Alert) -> bool:
        """Send alert to Slack."""
        config = self.channel_config[AlertChannel.SLACK]
        if not config["enabled"]:
            logger.warning("Slack alerting not configured")
            return False
        
        try:
            payload = self._format_slack_payload(alert, config["channel"])
            
            async with aiohttp.ClientSession() as session:
                async with session.post(config["webhook_url"], json=payload) as response:
                    if response.status == 200:
                        return True
                    else:
                        logger.error(f"Slack API returned {response.status}")
                        return False
        
        except Exception as e:
            logger.error(f"Slack alert failed: {e}")
            return False
    
    async def _send_webhook_alert(self, alert: Alert) -> bool:
        """Send alert via webhook."""
        config = self.channel_config[AlertChannel.WEBHOOK]
        if not config["enabled"]:
            logger.warning("Webhook alerting not configured")
            return False
        
        try:
            payload = self._format_webhook_payload(alert)
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    config["webhook_url"], 
                    json=payload, 
                    headers=config["headers"]
                ) as response:
                    if response.status in [200, 201, 202]:
                        return True
                    else:
                        logger.error(f"Webhook returned {response.status}")
                        return False
        
        except Exception as e:
            logger.error(f"Webhook alert failed: {e}")
            return False
    
    async def _send_sms_alert(self, alert: Alert) -> bool:
        """Send alert via SMS (placeholder)."""
        logger.info(f"SMS alert would be sent for {alert.alert_id}")
        # TODO: Implement SMS alerting with service like Twilio
        return True
    
    def _format_email_body(self, alert: Alert) -> str:
        """Format alert for email delivery."""
        return f"""
Deployment Alert

Title: {alert.title}
Severity: {alert.severity.value.upper()}
Deployment ID: {alert.deployment_id}
Rule: {alert.rule_name}
Time: {alert.timestamp.isoformat()}

Message:
{alert.message}

---
Olorin Deployment Monitoring System
"""
    
    def _format_slack_payload(self, alert: Alert, channel: str) -> Dict[str, Any]:
        """Format alert for Slack delivery."""
        color_map = {
            AlertSeverity.INFO: "good",
            AlertSeverity.WARNING: "warning", 
            AlertSeverity.ERROR: "danger",
            AlertSeverity.CRITICAL: "danger"
        }
        
        return {
            "channel": channel,
            "username": "Olorin Deployment Monitor",
            "attachments": [{
                "color": color_map.get(alert.severity, "warning"),
                "title": alert.title,
                "text": alert.message,
                "fields": [
                    {"title": "Severity", "value": alert.severity.value.upper(), "short": True},
                    {"title": "Deployment ID", "value": alert.deployment_id, "short": True},
                    {"title": "Rule", "value": alert.rule_name, "short": True},
                    {"title": "Time", "value": alert.timestamp.isoformat(), "short": True}
                ],
                "footer": "Olorin Deployment Monitor",
                "ts": int(alert.timestamp.timestamp())
            }]
        }
    
    def _format_webhook_payload(self, alert: Alert) -> Dict[str, Any]:
        """Format alert for webhook delivery."""
        return {
            "alert_id": alert.alert_id,
            "rule_name": alert.rule_name,
            "deployment_id": alert.deployment_id,
            "severity": alert.severity.value,
            "title": alert.title,
            "message": alert.message,
            "timestamp": alert.timestamp.isoformat(),
            "source": "olorin_deployment_monitor"
        }
    
    def is_channel_configured(self, channel: AlertChannel) -> bool:
        """Check if a channel is properly configured."""
        return self.channel_config.get(channel, {}).get("enabled", False)
    
    def get_configured_channels(self) -> List[AlertChannel]:
        """Get list of properly configured channels."""
        return [
            channel for channel in AlertChannel
            if self.is_channel_configured(channel)
        ]