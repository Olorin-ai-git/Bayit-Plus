"""
Investigation Communication Events (ICE) System

Real-time event system for agent communication and investigation coordination.
Provides comprehensive event publishing, subscription, and handling capabilities.
"""

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Union
from collections import defaultdict
import json

logger = logging.getLogger(__name__)


class ICEEventType(Enum):
    """Types of Investigation Communication Events"""
    
    # Investigation lifecycle events
    INVESTIGATION_STARTED = "investigation_started"
    INVESTIGATION_COMPLETED = "investigation_completed"
    INVESTIGATION_FAILED = "investigation_failed"
    INVESTIGATION_PAUSED = "investigation_paused"
    INVESTIGATION_RESUMED = "investigation_resumed"
    
    # Agent lifecycle events
    AGENT_CREATED = "agent_created"
    AGENT_STARTED = "agent_started"
    AGENT_COMPLETED = "agent_completed"
    AGENT_FAILED = "agent_failed"
    AGENT_IDLE = "agent_idle"
    AGENT_TERMINATED = "agent_terminated"
    
    # Pattern execution events
    PATTERN_STARTED = "pattern_started"
    PATTERN_STEP_COMPLETED = "pattern_step_completed"
    PATTERN_COMPLETED = "pattern_completed"
    PATTERN_FAILED = "pattern_failed"
    PATTERN_OPTIMIZED = "pattern_optimized"
    
    # Tool execution events
    TOOL_STARTED = "tool_started"
    TOOL_COMPLETED = "tool_completed"
    TOOL_FAILED = "tool_failed"
    TOOL_RETRIED = "tool_retried"
    TOOL_CACHED = "tool_cached"
    
    # Data events
    DATA_DISCOVERED = "data_discovered"
    DATA_PROCESSED = "data_processed"
    DATA_VALIDATED = "data_validated"
    DATA_CORRUPTED = "data_corrupted"
    
    # Analysis events
    INSIGHT_GENERATED = "insight_generated"
    PATTERN_DETECTED = "pattern_detected"
    ANOMALY_DETECTED = "anomaly_detected"
    RISK_CALCULATED = "risk_calculated"
    RECOMMENDATION_GENERATED = "recommendation_generated"
    
    # Coordination events
    COORDINATION_REQUEST = "coordination_request"
    COORDINATION_RESPONSE = "coordination_response"
    RESOURCE_ALLOCATED = "resource_allocated"
    RESOURCE_RELEASED = "resource_released"
    DEPENDENCY_RESOLVED = "dependency_resolved"
    
    # Quality events
    QUALITY_CHECK_STARTED = "quality_check_started"
    QUALITY_CHECK_PASSED = "quality_check_passed"
    QUALITY_CHECK_FAILED = "quality_check_failed"
    OPTIMIZATION_SUGGESTED = "optimization_suggested"
    
    # Error and warning events
    ERROR_OCCURRED = "error_occurred"
    WARNING_RAISED = "warning_raised"
    RECOVERY_STARTED = "recovery_started"
    RECOVERY_COMPLETED = "recovery_completed"
    
    # Performance events
    PERFORMANCE_THRESHOLD_EXCEEDED = "performance_threshold_exceeded"
    CACHE_HIT = "cache_hit"
    CACHE_MISS = "cache_miss"
    SLOW_OPERATION = "slow_operation"
    
    # Custom events
    CUSTOM_EVENT = "custom_event"


@dataclass
class ICEEvent:
    """Investigation Communication Event"""
    
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: ICEEventType = ICEEventType.CUSTOM_EVENT
    timestamp: datetime = field(default_factory=datetime.now)
    
    # Source information
    source_agent_id: Optional[str] = None
    source_pattern: Optional[str] = None
    source_tool: Optional[str] = None
    
    # Target information (for directed events)
    target_agent_id: Optional[str] = None
    target_pattern: Optional[str] = None
    target_tool: Optional[str] = None
    
    # Investigation context
    investigation_id: str = ""
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    
    # Event data
    event_data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Event properties
    priority: int = 100  # Lower numbers = higher priority
    correlation_id: Optional[str] = None
    parent_event_id: Optional[str] = None
    tags: Set[str] = field(default_factory=set)
    
    # Processing flags
    processed: bool = False
    processing_count: int = 0
    max_processing_attempts: int = 3
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary"""
        return {
            'event_id': self.event_id,
            'event_type': self.event_type.value,
            'timestamp': self.timestamp.isoformat(),
            'source_agent_id': self.source_agent_id,
            'source_pattern': self.source_pattern,
            'source_tool': self.source_tool,
            'target_agent_id': self.target_agent_id,
            'target_pattern': self.target_pattern,
            'target_tool': self.target_tool,
            'investigation_id': self.investigation_id,
            'entity_id': self.entity_id,
            'entity_type': self.entity_type,
            'event_data': self.event_data,
            'metadata': self.metadata,
            'priority': self.priority,
            'correlation_id': self.correlation_id,
            'parent_event_id': self.parent_event_id,
            'tags': list(self.tags),
            'processed': self.processed,
            'processing_count': self.processing_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ICEEvent':
        """Create event from dictionary"""
        event = cls()
        event.event_id = data.get('event_id', str(uuid.uuid4()))
        event.event_type = ICEEventType(data.get('event_type', 'custom_event'))
        event.timestamp = datetime.fromisoformat(data['timestamp']) if 'timestamp' in data else datetime.now()
        event.source_agent_id = data.get('source_agent_id')
        event.source_pattern = data.get('source_pattern')
        event.source_tool = data.get('source_tool')
        event.target_agent_id = data.get('target_agent_id')
        event.target_pattern = data.get('target_pattern')
        event.target_tool = data.get('target_tool')
        event.investigation_id = data.get('investigation_id', '')
        event.entity_id = data.get('entity_id')
        event.entity_type = data.get('entity_type')
        event.event_data = data.get('event_data', {})
        event.metadata = data.get('metadata', {})
        event.priority = data.get('priority', 100)
        event.correlation_id = data.get('correlation_id')
        event.parent_event_id = data.get('parent_event_id')
        event.tags = set(data.get('tags', []))
        event.processed = data.get('processed', False)
        event.processing_count = data.get('processing_count', 0)
        return event
    
    def add_tag(self, tag: str) -> None:
        """Add tag to event"""
        self.tags.add(tag)
    
    def has_tag(self, tag: str) -> bool:
        """Check if event has tag"""
        return tag in self.tags
    
    def is_from_agent(self, agent_id: str) -> bool:
        """Check if event is from specific agent"""
        return self.source_agent_id == agent_id
    
    def is_for_agent(self, agent_id: str) -> bool:
        """Check if event is targeted to specific agent"""
        return self.target_agent_id == agent_id or self.target_agent_id is None
    
    def mark_processed(self) -> None:
        """Mark event as processed"""
        self.processed = True
        self.processing_count += 1


ICEEventHandler = Callable[[ICEEvent], Any]


@dataclass 
class ICEEventSubscription:
    """Event subscription information"""
    
    subscription_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_types: Set[ICEEventType] = field(default_factory=set)
    handler: ICEEventHandler = None
    subscriber_id: str = ""
    
    # Filtering criteria
    source_filters: Set[str] = field(default_factory=set)  # Source agent/pattern/tool IDs
    target_filters: Set[str] = field(default_factory=set)  # Target agent/pattern/tool IDs
    tag_filters: Set[str] = field(default_factory=set)  # Required tags
    investigation_filters: Set[str] = field(default_factory=set)  # Investigation IDs
    
    # Subscription properties
    active: bool = True
    async_handler: bool = True
    priority: int = 100
    max_events_per_second: float = 100.0
    
    # Statistics
    events_processed: int = 0
    last_event_time: Optional[datetime] = None
    creation_time: datetime = field(default_factory=datetime.now)
    
    def matches_event(self, event: ICEEvent) -> bool:
        """Check if subscription matches event"""
        
        if not self.active:
            return False
        
        # Check event type
        if self.event_types and event.event_type not in self.event_types:
            return False
        
        # Check source filters
        if self.source_filters:
            sources = {event.source_agent_id, event.source_pattern, event.source_tool}
            if not any(source in self.source_filters for source in sources if source):
                return False
        
        # Check target filters
        if self.target_filters:
            targets = {event.target_agent_id, event.target_pattern, event.target_tool}
            if not any(target in self.target_filters for target in targets if target):
                return False
        
        # Check tag filters
        if self.tag_filters:
            if not self.tag_filters.issubset(event.tags):
                return False
        
        # Check investigation filters
        if self.investigation_filters:
            if event.investigation_id not in self.investigation_filters:
                return False
        
        return True
    
    def can_process_event(self) -> bool:
        """Check if subscription can process another event (rate limiting)"""
        if not self.last_event_time:
            return True
        
        time_since_last = (datetime.now() - self.last_event_time).total_seconds()
        min_interval = 1.0 / self.max_events_per_second
        
        return time_since_last >= min_interval
    
    def record_event_processed(self) -> None:
        """Record that an event was processed"""
        self.events_processed += 1
        self.last_event_time = datetime.now()


class ICEEventBus:
    """
    Investigation Communication Events Bus
    
    Central event processing system for agent communication and coordination.
    Provides event publishing, subscription management, and reliable delivery.
    """
    
    def __init__(
        self,
        max_queue_size: int = 10000,
        event_retention_hours: int = 24,
        enable_persistence: bool = True,
        enable_metrics: bool = True
    ):
        """Initialize ICE event bus"""
        
        self.max_queue_size = max_queue_size
        self.event_retention_hours = event_retention_hours
        self.enable_persistence = enable_persistence
        self.enable_metrics = enable_metrics
        
        # Event storage and queuing
        self.event_queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.event_history: List[ICEEvent] = []
        self.processed_events: Dict[str, ICEEvent] = {}
        
        # Subscription management
        self.subscriptions: Dict[str, ICEEventSubscription] = {}
        self.event_type_subscribers: Dict[ICEEventType, List[str]] = defaultdict(list)
        
        # Processing control
        self.processing_task: Optional[asyncio.Task] = None
        self.running = False
        self.processing_workers = 3
        
        # Statistics and monitoring
        self.stats = {
            'events_published': 0,
            'events_processed': 0,
            'events_failed': 0,
            'subscriptions_created': 0,
            'processing_errors': 0,
            'start_time': datetime.now()
        }
        
        # Event correlation tracking
        self.correlation_chains: Dict[str, List[str]] = defaultdict(list)
        
        self.logger = logging.getLogger(f"{__name__}.event_bus")
        
        # Start processing
        self.start()
    
    def start(self) -> None:
        """Start event processing"""
        if not self.running:
            self.running = True
            self.processing_task = asyncio.create_task(self._event_processing_loop())
            self.logger.info("ICE Event Bus started")
    
    def stop(self) -> None:
        """Stop event processing"""
        self.running = False
        if self.processing_task:
            self.processing_task.cancel()
        self.logger.info("ICE Event Bus stopped")
    
    async def publish(
        self,
        event_type: ICEEventType,
        event_data: Dict[str, Any],
        source_agent_id: Optional[str] = None,
        source_pattern: Optional[str] = None,
        source_tool: Optional[str] = None,
        target_agent_id: Optional[str] = None,
        investigation_id: str = "",
        priority: int = 100,
        tags: Optional[Set[str]] = None,
        correlation_id: Optional[str] = None
    ) -> str:
        """Publish an event to the bus"""
        
        try:
            # Create event
            event = ICEEvent(
                event_type=event_type,
                event_data=event_data,
                source_agent_id=source_agent_id,
                source_pattern=source_pattern,
                source_tool=source_tool,
                target_agent_id=target_agent_id,
                investigation_id=investigation_id,
                priority=priority,
                tags=tags or set(),
                correlation_id=correlation_id
            )
            
            # Add to correlation chain
            if correlation_id:
                self.correlation_chains[correlation_id].append(event.event_id)
            
            # Queue for processing
            await self.event_queue.put(event)
            
            # Update statistics
            self.stats['events_published'] += 1
            
            self.logger.debug(f"Published event {event.event_id}: {event_type.value}")
            return event.event_id
            
        except asyncio.QueueFull:
            self.logger.error("Event queue full, dropping event")
            self.stats['events_failed'] += 1
            raise RuntimeError("Event queue full")
        
        except Exception as e:
            self.logger.error(f"Failed to publish event: {str(e)}")
            self.stats['events_failed'] += 1
            raise
    
    def subscribe(
        self,
        handler: ICEEventHandler,
        event_types: Union[ICEEventType, List[ICEEventType]],
        subscriber_id: str = "",
        source_filters: Optional[Set[str]] = None,
        target_filters: Optional[Set[str]] = None,
        tag_filters: Optional[Set[str]] = None,
        investigation_filters: Optional[Set[str]] = None,
        async_handler: bool = True,
        priority: int = 100
    ) -> str:
        """Subscribe to events"""
        
        # Normalize event types
        if isinstance(event_types, ICEEventType):
            event_types = {event_types}
        else:
            event_types = set(event_types)
        
        # Create subscription
        subscription = ICEEventSubscription(
            event_types=event_types,
            handler=handler,
            subscriber_id=subscriber_id or f"subscriber_{len(self.subscriptions)}",
            source_filters=source_filters or set(),
            target_filters=target_filters or set(),
            tag_filters=tag_filters or set(),
            investigation_filters=investigation_filters or set(),
            async_handler=async_handler,
            priority=priority
        )
        
        # Register subscription
        self.subscriptions[subscription.subscription_id] = subscription
        
        # Update event type index
        for event_type in event_types:
            self.event_type_subscribers[event_type].append(subscription.subscription_id)
        
        # Update statistics
        self.stats['subscriptions_created'] += 1
        
        self.logger.info(f"Created subscription {subscription.subscription_id} for {len(event_types)} event types")
        return subscription.subscription_id
    
    def unsubscribe(self, subscription_id: str) -> bool:
        """Unsubscribe from events"""
        
        if subscription_id not in self.subscriptions:
            return False
        
        subscription = self.subscriptions[subscription_id]
        
        # Remove from event type index
        for event_type in subscription.event_types:
            if subscription_id in self.event_type_subscribers[event_type]:
                self.event_type_subscribers[event_type].remove(subscription_id)
        
        # Remove subscription
        del self.subscriptions[subscription_id]
        
        self.logger.info(f"Removed subscription {subscription_id}")
        return True
    
    async def _event_processing_loop(self) -> None:
        """Main event processing loop"""
        
        while self.running:
            try:
                # Get event from queue with timeout
                try:
                    event = await asyncio.wait_for(self.event_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                # Process event
                await self._process_event(event)
                
                # Mark task done
                self.event_queue.task_done()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Event processing error: {str(e)}", exc_info=True)
                self.stats['processing_errors'] += 1
    
    async def _process_event(self, event: ICEEvent) -> None:
        """Process a single event"""
        
        try:
            # Store in history
            self.event_history.append(event)
            
            # Clean old events periodically
            if len(self.event_history) % 1000 == 0:
                await self._cleanup_old_events()
            
            # Find matching subscriptions
            matching_subscriptions = []
            
            for subscription_id in self.event_type_subscribers.get(event.event_type, []):
                subscription = self.subscriptions.get(subscription_id)
                
                if subscription and subscription.matches_event(event):
                    if subscription.can_process_event():
                        matching_subscriptions.append(subscription)
            
            # Sort by priority (lower number = higher priority)
            matching_subscriptions.sort(key=lambda s: s.priority)
            
            # Execute handlers
            for subscription in matching_subscriptions:
                try:
                    if subscription.async_handler:
                        await subscription.handler(event)
                    else:
                        # Run sync handler in thread pool
                        await asyncio.get_event_loop().run_in_executor(
                            None, subscription.handler, event
                        )
                    
                    subscription.record_event_processed()
                    
                except Exception as e:
                    self.logger.error(
                        f"Event handler error in subscription {subscription.subscription_id}: {str(e)}",
                        exc_info=True
                    )
            
            # Mark event as processed
            event.mark_processed()
            self.processed_events[event.event_id] = event
            
            # Update statistics
            self.stats['events_processed'] += 1
            
            self.logger.debug(f"Processed event {event.event_id} with {len(matching_subscriptions)} handlers")
            
        except Exception as e:
            self.logger.error(f"Failed to process event {event.event_id}: {str(e)}", exc_info=True)
            self.stats['processing_errors'] += 1
    
    async def _cleanup_old_events(self) -> None:
        """Clean up old events from history"""
        
        cutoff_time = datetime.now() - timedelta(hours=self.event_retention_hours)
        
        # Remove old events from history
        self.event_history = [
            event for event in self.event_history 
            if event.timestamp > cutoff_time
        ]
        
        # Clean processed events
        old_processed_keys = [
            event_id for event_id, event in self.processed_events.items()
            if event.timestamp < cutoff_time
        ]
        
        for event_id in old_processed_keys:
            del self.processed_events[event_id]
        
        # Clean correlation chains
        old_correlations = []
        for correlation_id, event_ids in self.correlation_chains.items():
            # Keep correlations that have recent events
            recent_events = [
                event_id for event_id in event_ids
                if event_id in self.processed_events or any(
                    e.event_id == event_id and e.timestamp > cutoff_time 
                    for e in self.event_history
                )
            ]
            
            if recent_events:
                self.correlation_chains[correlation_id] = recent_events
            else:
                old_correlations.append(correlation_id)
        
        for correlation_id in old_correlations:
            del self.correlation_chains[correlation_id]
        
        if old_processed_keys or old_correlations:
            self.logger.debug(f"Cleaned up {len(old_processed_keys)} old events and {len(old_correlations)} old correlations")
    
    def get_event_by_id(self, event_id: str) -> Optional[ICEEvent]:
        """Get event by ID"""
        
        # Check processed events first
        if event_id in self.processed_events:
            return self.processed_events[event_id]
        
        # Check history
        for event in self.event_history:
            if event.event_id == event_id:
                return event
        
        return None
    
    def get_events_by_correlation(self, correlation_id: str) -> List[ICEEvent]:
        """Get all events in a correlation chain"""
        
        event_ids = self.correlation_chains.get(correlation_id, [])
        events = []
        
        for event_id in event_ids:
            event = self.get_event_by_id(event_id)
            if event:
                events.append(event)
        
        return events
    
    def get_events_by_investigation(
        self, 
        investigation_id: str, 
        event_types: Optional[Set[ICEEventType]] = None,
        limit: int = 100
    ) -> List[ICEEvent]:
        """Get events for a specific investigation"""
        
        matching_events = []
        
        # Search processed events
        for event in self.processed_events.values():
            if event.investigation_id == investigation_id:
                if event_types is None or event.event_type in event_types:
                    matching_events.append(event)
        
        # Search history
        for event in self.event_history:
            if event.investigation_id == investigation_id:
                if event_types is None or event.event_type in event_types:
                    matching_events.append(event)
        
        # Remove duplicates and sort by timestamp
        seen_ids = set()
        unique_events = []
        for event in matching_events:
            if event.event_id not in seen_ids:
                unique_events.append(event)
                seen_ids.add(event.event_id)
        
        unique_events.sort(key=lambda e: e.timestamp, reverse=True)
        return unique_events[:limit]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get event bus statistics"""
        
        uptime = (datetime.now() - self.stats['start_time']).total_seconds()
        
        return {
            'bus_status': {
                'running': self.running,
                'uptime_seconds': uptime,
                'queue_size': self.event_queue.qsize(),
                'max_queue_size': self.max_queue_size,
                'history_size': len(self.event_history),
                'processed_events_cache': len(self.processed_events)
            },
            'event_stats': {
                'events_published': self.stats['events_published'],
                'events_processed': self.stats['events_processed'],
                'events_failed': self.stats['events_failed'],
                'processing_errors': self.stats['processing_errors'],
                'events_per_second': self.stats['events_processed'] / max(1, uptime)
            },
            'subscription_stats': {
                'active_subscriptions': len(self.subscriptions),
                'subscriptions_created': self.stats['subscriptions_created'],
                'event_types_with_subscribers': len(self.event_type_subscribers)
            },
            'correlation_stats': {
                'active_correlation_chains': len(self.correlation_chains),
                'total_correlated_events': sum(len(events) for events in self.correlation_chains.values())
            }
        }
    
    def get_subscription_stats(self) -> Dict[str, Any]:
        """Get detailed subscription statistics"""
        
        subscription_details = {}
        for sub_id, subscription in self.subscriptions.items():
            subscription_details[sub_id] = {
                'subscriber_id': subscription.subscriber_id,
                'event_types': [et.value for et in subscription.event_types],
                'events_processed': subscription.events_processed,
                'last_event_time': subscription.last_event_time.isoformat() if subscription.last_event_time else None,
                'creation_time': subscription.creation_time.isoformat(),
                'active': subscription.active,
                'priority': subscription.priority
            }
        
        return subscription_details
    
    async def wait_for_empty_queue(self, timeout: float = 30.0) -> bool:
        """Wait for event queue to be empty"""
        
        try:
            await asyncio.wait_for(self.event_queue.join(), timeout=timeout)
            return True
        except asyncio.TimeoutError:
            return False


# Global event bus instance
_event_bus: Optional[ICEEventBus] = None


def get_event_bus() -> ICEEventBus:
    """Get the global ICE event bus instance"""
    global _event_bus
    
    if _event_bus is None:
        _event_bus = ICEEventBus()
    
    return _event_bus