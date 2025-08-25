"""
Agent Communication Hub

Advanced communication system for multi-agent coordination, message passing,
and distributed investigation management.
"""

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Callable, Union
from collections import defaultdict, deque

from .ice_events import ICEEventBus, ICEEventType, get_event_bus

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """Types of agent messages"""
    
    # Control messages
    START_INVESTIGATION = "start_investigation"
    PAUSE_INVESTIGATION = "pause_investigation"
    RESUME_INVESTIGATION = "resume_investigation" 
    STOP_INVESTIGATION = "stop_investigation"
    
    # Task coordination
    TASK_ASSIGNMENT = "task_assignment"
    TASK_ACCEPTANCE = "task_acceptance"
    TASK_REJECTION = "task_rejection"
    TASK_COMPLETION = "task_completion"
    TASK_PROGRESS = "task_progress"
    
    # Data sharing
    DATA_REQUEST = "data_request"
    DATA_RESPONSE = "data_response"
    DATA_NOTIFICATION = "data_notification"
    
    # Analysis coordination
    ANALYSIS_REQUEST = "analysis_request"
    ANALYSIS_RESPONSE = "analysis_response"
    INSIGHT_SHARING = "insight_sharing"
    PATTERN_SHARING = "pattern_sharing"
    
    # Resource management
    RESOURCE_REQUEST = "resource_request"
    RESOURCE_GRANT = "resource_grant"
    RESOURCE_DENY = "resource_deny"
    RESOURCE_RELEASE = "resource_release"
    
    # Quality and validation
    VALIDATION_REQUEST = "validation_request"
    VALIDATION_RESPONSE = "validation_response"
    QUALITY_REPORT = "quality_report"
    
    # Status and health
    STATUS_REQUEST = "status_request"
    STATUS_RESPONSE = "status_response"
    HEALTH_CHECK = "health_check"
    HEALTH_RESPONSE = "health_response"
    
    # Error handling
    ERROR_NOTIFICATION = "error_notification"
    RECOVERY_REQUEST = "recovery_request"
    RECOVERY_RESPONSE = "recovery_response"
    
    # Custom messages
    CUSTOM_MESSAGE = "custom_message"


class CommunicationProtocol(Enum):
    """Communication protocols"""
    
    DIRECT = "direct"  # Direct agent-to-agent
    BROADCAST = "broadcast"  # One-to-many
    MULTICAST = "multicast"  # Selective broadcast
    REQUEST_RESPONSE = "request_response"  # Synchronous request/response
    PUBLISH_SUBSCRIBE = "publish_subscribe"  # Event-driven
    PIPELINE = "pipeline"  # Sequential processing
    


@dataclass
class AgentMessage:
    """Message between agents"""
    
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    message_type: MessageType = MessageType.CUSTOM_MESSAGE
    protocol: CommunicationProtocol = CommunicationProtocol.DIRECT
    
    # Routing information
    sender_id: str = ""
    sender_type: str = ""  # agent, pattern, tool, etc.
    recipient_id: Optional[str] = None
    recipient_type: Optional[str] = None
    recipients: Set[str] = field(default_factory=set)  # For multicast/broadcast
    
    # Message content
    subject: str = ""
    content: Dict[str, Any] = field(default_factory=dict)
    attachments: List[Dict[str, Any]] = field(default_factory=list)
    
    # Message properties
    timestamp: datetime = field(default_factory=datetime.now)
    correlation_id: Optional[str] = None
    reply_to_message_id: Optional[str] = None
    priority: int = 100
    ttl_seconds: int = 3600  # Time to live
    
    # Investigation context
    investigation_id: str = ""
    entity_id: Optional[str] = None
    
    # Processing tracking
    delivered: bool = False
    acknowledged: bool = False
    processed: bool = False
    processing_attempts: int = 0
    max_processing_attempts: int = 3
    
    # Response tracking
    requires_response: bool = False
    response_timeout_seconds: float = 30.0
    response_received: bool = False
    
    def is_expired(self) -> bool:
        """Check if message has expired"""
        return datetime.now() > self.timestamp + timedelta(seconds=self.ttl_seconds)
    
    def mark_delivered(self) -> None:
        """Mark message as delivered"""
        self.delivered = True
    
    def mark_acknowledged(self) -> None:
        """Mark message as acknowledged"""
        self.acknowledged = True
    
    def mark_processed(self) -> None:
        """Mark message as processed"""
        self.processed = True
        self.processing_attempts += 1
    
    def can_retry_processing(self) -> bool:
        """Check if message processing can be retried"""
        return self.processing_attempts < self.max_processing_attempts
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary"""
        return {
            'message_id': self.message_id,
            'message_type': self.message_type.value,
            'protocol': self.protocol.value,
            'sender_id': self.sender_id,
            'sender_type': self.sender_type,
            'recipient_id': self.recipient_id,
            'recipient_type': self.recipient_type,
            'recipients': list(self.recipients),
            'subject': self.subject,
            'content': self.content,
            'attachments': self.attachments,
            'timestamp': self.timestamp.isoformat(),
            'correlation_id': self.correlation_id,
            'reply_to_message_id': self.reply_to_message_id,
            'priority': self.priority,
            'ttl_seconds': self.ttl_seconds,
            'investigation_id': self.investigation_id,
            'entity_id': self.entity_id,
            'requires_response': self.requires_response,
            'response_timeout_seconds': self.response_timeout_seconds
        }


@dataclass
class CommunicationChannel:
    """Communication channel between agents"""
    
    channel_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    channel_name: str = ""
    channel_type: str = "direct"  # direct, group, broadcast
    
    # Channel participants
    participants: Set[str] = field(default_factory=set)
    moderators: Set[str] = field(default_factory=set)
    
    # Channel properties
    created_at: datetime = field(default_factory=datetime.now)
    active: bool = True
    persistent: bool = True
    max_message_history: int = 1000
    
    # Message storage
    message_history: deque = field(default_factory=lambda: deque(maxlen=1000))
    pending_messages: Dict[str, AgentMessage] = field(default_factory=dict)
    
    # Statistics
    messages_sent: int = 0
    messages_received: int = 0
    last_activity: Optional[datetime] = None
    
    def add_participant(self, agent_id: str, is_moderator: bool = False) -> None:
        """Add participant to channel"""
        self.participants.add(agent_id)
        if is_moderator:
            self.moderators.add(agent_id)
    
    def remove_participant(self, agent_id: str) -> None:
        """Remove participant from channel"""
        self.participants.discard(agent_id)
        self.moderators.discard(agent_id)
    
    def has_participant(self, agent_id: str) -> bool:
        """Check if agent is participant"""
        return agent_id in self.participants
    
    def is_moderator(self, agent_id: str) -> bool:
        """Check if agent is moderator"""
        return agent_id in self.moderators
    
    def add_message(self, message: AgentMessage) -> None:
        """Add message to channel history"""
        self.message_history.append(message)
        self.messages_sent += 1
        self.last_activity = datetime.now()
    
    def get_recent_messages(self, limit: int = 50) -> List[AgentMessage]:
        """Get recent messages from channel"""
        messages = list(self.message_history)
        return messages[-limit:] if len(messages) > limit else messages


MessageHandler = Callable[[AgentMessage], Any]


class AgentCommunicationHub:
    """
    Central hub for agent communication and coordination.
    
    Features:
    - Multi-protocol message routing
    - Channel management and moderation
    - Message persistence and replay
    - Communication analytics and monitoring
    - Quality of service guarantees
    - Conversation threading and correlation
    - Security and access control
    """
    
    def __init__(
        self,
        max_message_queue_size: int = 10000,
        message_retention_hours: int = 48,
        enable_message_persistence: bool = True,
        enable_analytics: bool = True,
        event_bus: Optional[ICEEventBus] = None
    ):
        """Initialize communication hub"""
        
        self.max_message_queue_size = max_message_queue_size
        self.message_retention_hours = message_retention_hours
        self.enable_message_persistence = enable_message_persistence
        self.enable_analytics = enable_analytics
        
        # Event bus integration
        self.event_bus = event_bus or get_event_bus()
        
        # Message routing and storage
        self.message_queue: asyncio.Queue = asyncio.Queue(maxsize=max_message_queue_size)
        self.message_history: Dict[str, AgentMessage] = {}
        self.pending_responses: Dict[str, AgentMessage] = {}
        
        # Agent management
        self.registered_agents: Dict[str, Dict[str, Any]] = {}
        self.agent_message_handlers: Dict[str, MessageHandler] = {}
        self.agent_last_seen: Dict[str, datetime] = {}
        
        # Channel management
        self.channels: Dict[str, CommunicationChannel] = {}
        self.agent_channels: Dict[str, Set[str]] = defaultdict(set)  # agent_id -> channel_ids
        
        # Message routing
        self.route_table: Dict[str, str] = {}  # recipient_id -> channel_id for direct routing
        self.broadcast_channels: Set[str] = set()
        
        # Processing control
        self.processing_task: Optional[asyncio.Task] = None
        self.running = False
        self.processing_workers = 5
        
        # Analytics and monitoring
        self.stats = {
            'messages_sent': 0,
            'messages_delivered': 0,
            'messages_failed': 0,
            'agents_registered': 0,
            'channels_created': 0,
            'start_time': datetime.now()
        }
        
        # Conversation threading
        self.conversations: Dict[str, List[str]] = defaultdict(list)  # correlation_id -> message_ids
        
        self.logger = logging.getLogger(f"{__name__}.communication_hub")
        
        # Start processing
        self.start()
    
    def start(self) -> None:
        """Start message processing"""
        if not self.running:
            self.running = True
            self.processing_task = asyncio.create_task(self._message_processing_loop())
            self.logger.info("Agent Communication Hub started")
    
    def stop(self) -> None:
        """Stop message processing"""
        self.running = False
        if self.processing_task:
            self.processing_task.cancel()
        self.logger.info("Agent Communication Hub stopped")
    
    def register_agent(
        self,
        agent_id: str,
        agent_type: str,
        capabilities: List[str],
        message_handler: Optional[MessageHandler] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Register an agent with the communication hub"""
        
        try:
            agent_info = {
                'agent_id': agent_id,
                'agent_type': agent_type,
                'capabilities': capabilities,
                'registration_time': datetime.now(),
                'active': True,
                'metadata': metadata or {}
            }
            
            self.registered_agents[agent_id] = agent_info
            
            if message_handler:
                self.agent_message_handlers[agent_id] = message_handler
            
            self.agent_last_seen[agent_id] = datetime.now()
            self.stats['agents_registered'] += 1
            
            # Publish registration event
            asyncio.create_task(self.event_bus.publish(
                ICEEventType.AGENT_CREATED,
                {
                    'agent_id': agent_id,
                    'agent_type': agent_type,
                    'capabilities': capabilities
                },
                source_agent_id=agent_id
            ))
            
            self.logger.info(f"Registered agent {agent_id} with type {agent_type}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to register agent {agent_id}: {str(e)}")
            return False
    
    def unregister_agent(self, agent_id: str) -> bool:
        """Unregister an agent"""
        
        try:
            if agent_id not in self.registered_agents:
                return False
            
            # Remove from channels
            channels_to_leave = list(self.agent_channels[agent_id])
            for channel_id in channels_to_leave:
                self.leave_channel(agent_id, channel_id)
            
            # Clean up
            del self.registered_agents[agent_id]
            self.agent_message_handlers.pop(agent_id, None)
            self.agent_last_seen.pop(agent_id, None)
            self.agent_channels.pop(agent_id, None)
            
            # Publish termination event
            asyncio.create_task(self.event_bus.publish(
                ICEEventType.AGENT_TERMINATED,
                {'agent_id': agent_id},
                source_agent_id=agent_id
            ))
            
            self.logger.info(f"Unregistered agent {agent_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to unregister agent {agent_id}: {str(e)}")
            return False
    
    async def send_message(
        self,
        sender_id: str,
        message_type: MessageType,
        content: Dict[str, Any],
        recipient_id: Optional[str] = None,
        recipients: Optional[Set[str]] = None,
        subject: str = "",
        protocol: CommunicationProtocol = CommunicationProtocol.DIRECT,
        investigation_id: str = "",
        priority: int = 100,
        requires_response: bool = False,
        response_timeout_seconds: float = 30.0,
        correlation_id: Optional[str] = None
    ) -> str:
        """Send a message"""
        
        try:
            # Create message
            message = AgentMessage(
                message_type=message_type,
                protocol=protocol,
                sender_id=sender_id,
                sender_type=self.registered_agents.get(sender_id, {}).get('agent_type', 'unknown'),
                recipient_id=recipient_id,
                recipients=recipients or set(),
                subject=subject,
                content=content,
                investigation_id=investigation_id,
                priority=priority,
                requires_response=requires_response,
                response_timeout_seconds=response_timeout_seconds,
                correlation_id=correlation_id
            )
            
            # Add to conversation thread
            if correlation_id:
                self.conversations[correlation_id].append(message.message_id)
            
            # Queue for processing
            await self.message_queue.put(message)
            
            # Update statistics
            self.stats['messages_sent'] += 1
            self.agent_last_seen[sender_id] = datetime.now()
            
            self.logger.debug(f"Queued message {message.message_id} from {sender_id}")
            return message.message_id
            
        except Exception as e:
            self.logger.error(f"Failed to send message from {sender_id}: {str(e)}")
            self.stats['messages_failed'] += 1
            raise
    
    async def send_response(
        self,
        original_message: AgentMessage,
        sender_id: str,
        response_content: Dict[str, Any],
        success: bool = True
    ) -> str:
        """Send a response to a message"""
        
        response_type = MessageType.CUSTOM_MESSAGE  # Could be more specific based on original message
        
        return await self.send_message(
            sender_id=sender_id,
            message_type=response_type,
            content={
                'success': success,
                'response_data': response_content,
                'original_message_id': original_message.message_id
            },
            recipient_id=original_message.sender_id,
            subject=f"Re: {original_message.subject}",
            protocol=CommunicationProtocol.DIRECT,
            investigation_id=original_message.investigation_id,
            correlation_id=original_message.correlation_id,
            reply_to_message_id=original_message.message_id
        )
    
    def create_channel(
        self,
        channel_name: str,
        channel_type: str = "group",
        creator_id: str = "",
        participants: Optional[Set[str]] = None,
        persistent: bool = True
    ) -> str:
        """Create a communication channel"""
        
        try:
            channel = CommunicationChannel(
                channel_name=channel_name,
                channel_type=channel_type,
                participants=participants or set(),
                persistent=persistent
            )
            
            # Add creator as moderator
            if creator_id:
                channel.add_participant(creator_id, is_moderator=True)
                self.agent_channels[creator_id].add(channel.channel_id)
            
            # Register channel
            self.channels[channel.channel_id] = channel
            
            if channel_type == "broadcast":
                self.broadcast_channels.add(channel.channel_id)
            
            self.stats['channels_created'] += 1
            
            self.logger.info(f"Created channel {channel.channel_id}: {channel_name}")
            return channel.channel_id
            
        except Exception as e:
            self.logger.error(f"Failed to create channel {channel_name}: {str(e)}")
            raise
    
    def join_channel(self, agent_id: str, channel_id: str) -> bool:
        """Add agent to channel"""
        
        if channel_id not in self.channels:
            return False
        
        channel = self.channels[channel_id]
        channel.add_participant(agent_id)
        self.agent_channels[agent_id].add(channel_id)
        
        # Update routing table for direct channels
        if channel.channel_type == "direct" and len(channel.participants) == 2:
            participants = list(channel.participants)
            self.route_table[participants[0]] = channel_id
            self.route_table[participants[1]] = channel_id
        
        self.logger.debug(f"Agent {agent_id} joined channel {channel_id}")
        return True
    
    def leave_channel(self, agent_id: str, channel_id: str) -> bool:
        """Remove agent from channel"""
        
        if channel_id not in self.channels:
            return False
        
        channel = self.channels[channel_id]
        channel.remove_participant(agent_id)
        self.agent_channels[agent_id].discard(channel_id)
        
        # Clean up empty non-persistent channels
        if not channel.persistent and not channel.participants:
            del self.channels[channel_id]
            self.broadcast_channels.discard(channel_id)
        
        self.logger.debug(f"Agent {agent_id} left channel {channel_id}")
        return True
    
    async def _message_processing_loop(self) -> None:
        """Main message processing loop"""
        
        while self.running:
            try:
                # Get message from queue with timeout
                try:
                    message = await asyncio.wait_for(self.message_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                # Process message
                await self._process_message(message)
                
                # Mark task done
                self.message_queue.task_done()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Message processing error: {str(e)}", exc_info=True)
    
    async def _process_message(self, message: AgentMessage) -> None:
        """Process a single message"""
        
        try:
            # Check if message is expired
            if message.is_expired():
                self.logger.warning(f"Message {message.message_id} expired, dropping")
                return
            
            # Store message in history
            self.message_history[message.message_id] = message
            
            # Route message based on protocol
            if message.protocol == CommunicationProtocol.DIRECT:
                await self._route_direct_message(message)
            elif message.protocol == CommunicationProtocol.BROADCAST:
                await self._route_broadcast_message(message)
            elif message.protocol == CommunicationProtocol.MULTICAST:
                await self._route_multicast_message(message)
            else:
                # Default to direct routing
                await self._route_direct_message(message)
            
            # Handle response tracking
            if message.requires_response:
                self.pending_responses[message.message_id] = message
                # Set up timeout for response
                asyncio.create_task(self._handle_response_timeout(message))
            
            # Update statistics
            self.stats['messages_delivered'] += 1
            
            # Publish communication event
            await self.event_bus.publish(
                ICEEventType.CUSTOM_EVENT,
                {
                    'event_type': 'message_sent',
                    'message_id': message.message_id,
                    'message_type': message.message_type.value,
                    'sender_id': message.sender_id,
                    'recipient_id': message.recipient_id
                },
                source_agent_id=message.sender_id,
                investigation_id=message.investigation_id,
                correlation_id=message.correlation_id
            )
            
        except Exception as e:
            self.logger.error(f"Failed to process message {message.message_id}: {str(e)}")
            self.stats['messages_failed'] += 1
    
    async def _route_direct_message(self, message: AgentMessage) -> None:
        """Route direct message to recipient"""
        
        recipient_id = message.recipient_id
        if not recipient_id:
            self.logger.warning(f"Direct message {message.message_id} has no recipient")
            return
        
        # Find or create direct channel
        channel_id = self.route_table.get(recipient_id)
        if not channel_id:
            # Create direct channel
            channel_id = self.create_channel(
                f"direct_{message.sender_id}_{recipient_id}",
                "direct",
                message.sender_id,
                {message.sender_id, recipient_id}
            )
        
        # Deliver message
        await self._deliver_message_to_channel(message, channel_id)
    
    async def _route_broadcast_message(self, message: AgentMessage) -> None:
        """Route broadcast message to all channels"""
        
        for channel_id in self.broadcast_channels:
            await self._deliver_message_to_channel(message, channel_id)
    
    async def _route_multicast_message(self, message: AgentMessage) -> None:
        """Route multicast message to specific recipients"""
        
        for recipient_id in message.recipients:
            # Create temporary direct message
            direct_message = AgentMessage(
                message_id=f"{message.message_id}_{recipient_id}",
                message_type=message.message_type,
                protocol=CommunicationProtocol.DIRECT,
                sender_id=message.sender_id,
                sender_type=message.sender_type,
                recipient_id=recipient_id,
                subject=message.subject,
                content=message.content,
                investigation_id=message.investigation_id,
                correlation_id=message.correlation_id
            )
            
            await self._route_direct_message(direct_message)
    
    async def _deliver_message_to_channel(self, message: AgentMessage, channel_id: str) -> None:
        """Deliver message to a specific channel"""
        
        if channel_id not in self.channels:
            self.logger.warning(f"Channel {channel_id} not found for message {message.message_id}")
            return
        
        channel = self.channels[channel_id]
        channel.add_message(message)
        
        # Deliver to all participants
        for participant_id in channel.participants:
            if participant_id != message.sender_id:  # Don't send to sender
                await self._deliver_message_to_agent(message, participant_id)
    
    async def _deliver_message_to_agent(self, message: AgentMessage, agent_id: str) -> None:
        """Deliver message to a specific agent"""
        
        try:
            # Check if agent has message handler
            if agent_id in self.agent_message_handlers:
                handler = self.agent_message_handlers[agent_id]
                
                # Execute handler
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(message)
                    else:
                        await asyncio.get_event_loop().run_in_executor(None, handler, message)
                    
                    message.mark_delivered()
                    self.agent_last_seen[agent_id] = datetime.now()
                    
                except Exception as e:
                    self.logger.error(f"Message handler failed for agent {agent_id}: {str(e)}")
            else:
                # No handler - just mark as delivered
                message.mark_delivered()
                self.logger.debug(f"No message handler for agent {agent_id}, message stored")
        
        except Exception as e:
            self.logger.error(f"Failed to deliver message to agent {agent_id}: {str(e)}")
    
    async def _handle_response_timeout(self, message: AgentMessage) -> None:
        """Handle response timeout for a message"""
        
        await asyncio.sleep(message.response_timeout_seconds)
        
        if message.message_id in self.pending_responses and not message.response_received:
            # Response timed out
            self.logger.warning(f"Response timeout for message {message.message_id}")
            
            # Publish timeout event
            await self.event_bus.publish(
                ICEEventType.CUSTOM_EVENT,
                {
                    'event_type': 'message_response_timeout',
                    'message_id': message.message_id,
                    'sender_id': message.sender_id,
                    'recipient_id': message.recipient_id
                },
                source_agent_id=message.sender_id,
                investigation_id=message.investigation_id
            )
            
            # Clean up
            del self.pending_responses[message.message_id]
    
    def get_message_by_id(self, message_id: str) -> Optional[AgentMessage]:
        """Get message by ID"""
        return self.message_history.get(message_id)
    
    def get_conversation_messages(self, correlation_id: str) -> List[AgentMessage]:
        """Get all messages in a conversation"""
        
        message_ids = self.conversations.get(correlation_id, [])
        messages = []
        
        for message_id in message_ids:
            message = self.get_message_by_id(message_id)
            if message:
                messages.append(message)
        
        # Sort by timestamp
        messages.sort(key=lambda m: m.timestamp)
        return messages
    
    def get_agent_channels(self, agent_id: str) -> List[CommunicationChannel]:
        """Get channels for an agent"""
        
        channel_ids = self.agent_channels.get(agent_id, set())
        channels = []
        
        for channel_id in channel_ids:
            if channel_id in self.channels:
                channels.append(self.channels[channel_id])
        
        return channels
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get communication hub statistics"""
        
        uptime = (datetime.now() - self.stats['start_time']).total_seconds()
        
        return {
            'hub_status': {
                'running': self.running,
                'uptime_seconds': uptime,
                'message_queue_size': self.message_queue.qsize(),
                'registered_agents': len(self.registered_agents),
                'active_channels': len(self.channels),
                'pending_responses': len(self.pending_responses)
            },
            'message_stats': {
                'messages_sent': self.stats['messages_sent'],
                'messages_delivered': self.stats['messages_delivered'],
                'messages_failed': self.stats['messages_failed'],
                'messages_per_second': self.stats['messages_sent'] / max(1, uptime),
                'message_history_size': len(self.message_history)
            },
            'agent_stats': {
                'agents_registered': self.stats['agents_registered'],
                'channels_created': self.stats['channels_created'],
                'active_conversations': len(self.conversations)
            }
        }
    
    async def cleanup_old_messages(self) -> None:
        """Clean up old messages and conversations"""
        
        cutoff_time = datetime.now() - timedelta(hours=self.message_retention_hours)
        
        # Clean message history
        old_message_ids = [
            msg_id for msg_id, message in self.message_history.items()
            if message.timestamp < cutoff_time
        ]
        
        for msg_id in old_message_ids:
            del self.message_history[msg_id]
        
        # Clean conversations
        for correlation_id, message_ids in list(self.conversations.items()):
            # Keep conversations that have recent messages
            recent_messages = [
                msg_id for msg_id in message_ids
                if msg_id in self.message_history
            ]
            
            if recent_messages:
                self.conversations[correlation_id] = recent_messages
            else:
                del self.conversations[correlation_id]
        
        if old_message_ids:
            self.logger.debug(f"Cleaned up {len(old_message_ids)} old messages")


# Global communication hub instance
_communication_hub: Optional[AgentCommunicationHub] = None


def get_communication_hub() -> AgentCommunicationHub:
    """Get the global communication hub instance"""
    global _communication_hub
    
    if _communication_hub is None:
        _communication_hub = AgentCommunicationHub()
    
    return _communication_hub