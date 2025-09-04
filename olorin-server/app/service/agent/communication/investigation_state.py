"""
Investigation State Management

Comprehensive state management system for fraud investigations with state transitions,
validation, persistence, and coordination across multiple agents and patterns.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Callable, Union
from collections import defaultdict
import json

from .ice_events import ICEEventBus, ICEEventType, get_event_bus
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class InvestigationState(Enum):
    """Investigation states"""
    
    # Initial states
    CREATED = "created"
    INITIALIZING = "initializing"
    INITIALIZED = "initialized"
    
    # Active states
    STARTING = "starting"
    RUNNING = "running"
    ANALYZING = "analyzing"
    PROCESSING = "processing"
    COORDINATING = "coordinating"
    
    # Transition states
    PAUSING = "pausing"
    PAUSED = "paused"
    RESUMING = "resuming"
    
    # Quality states
    VALIDATING = "validating"
    OPTIMIZING = "optimizing"
    
    # Completion states
    COMPLETING = "completing"
    COMPLETED = "completed"
    
    # Error states
    ERROR = "error"
    FAILED = "failed"
    TIMEOUT = "timeout"
    
    # Terminal states
    CANCELLED = "cancelled"
    ARCHIVED = "archived"


@dataclass
class StateTransition:
    """Investigation state transition"""
    
    transition_id: str
    from_state: InvestigationState
    to_state: InvestigationState
    timestamp: datetime = field(default_factory=datetime.now)
    
    # Transition context
    triggered_by: str = ""  # agent_id, pattern_id, etc.
    trigger_reason: str = ""
    transition_data: Dict[str, Any] = field(default_factory=dict)
    
    # Validation
    validation_passed: bool = True
    validation_errors: List[str] = field(default_factory=list)
    
    # Timing
    duration_seconds: Optional[float] = None
    expected_duration_seconds: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert transition to dictionary"""
        return {
            'transition_id': self.transition_id,
            'from_state': self.from_state.value,
            'to_state': self.to_state.value,
            'timestamp': self.timestamp.isoformat(),
            'triggered_by': self.triggered_by,
            'trigger_reason': self.trigger_reason,
            'transition_data': self.transition_data,
            'validation_passed': self.validation_passed,
            'validation_errors': self.validation_errors,
            'duration_seconds': self.duration_seconds,
            'expected_duration_seconds': self.expected_duration_seconds
        }


@dataclass
class StateValidator:
    """State transition validator"""
    
    validator_id: str
    name: str
    validator_func: Callable
    enabled: bool = True
    priority: int = 100
    
    # Validation scope
    applicable_transitions: Set[tuple] = field(default_factory=set)  # (from_state, to_state) tuples
    applicable_states: Set[InvestigationState] = field(default_factory=set)
    
    # Validation properties
    async_validator: bool = True
    timeout_seconds: float = 5.0
    required: bool = False  # If true, validation failure blocks transition
    
    # Statistics
    validations_performed: int = 0
    validations_passed: int = 0
    validations_failed: int = 0
    last_validation: Optional[datetime] = None
    
    def is_applicable(self, from_state: InvestigationState, to_state: InvestigationState) -> bool:
        """Check if validator applies to transition"""
        
        if not self.enabled:
            return False
        
        # Check specific transitions
        if self.applicable_transitions:
            return (from_state, to_state) in self.applicable_transitions
        
        # Check applicable states
        if self.applicable_states:
            return from_state in self.applicable_states or to_state in self.applicable_states
        
        # Default: applies to all
        return True
    
    async def validate(
        self,
        investigation_data: Dict[str, Any],
        from_state: InvestigationState,
        to_state: InvestigationState,
        context: Dict[str, Any]
    ) -> tuple[bool, List[str]]:
        """Perform validation"""
        
        try:
            self.validations_performed += 1
            self.last_validation = datetime.now()
            
            if self.async_validator:
                result = await asyncio.wait_for(
                    self.validator_func(investigation_data, from_state, to_state, context),
                    timeout=self.timeout_seconds
                )
            else:
                result = await asyncio.get_event_loop().run_in_executor(
                    None, self.validator_func, investigation_data, from_state, to_state, context
                )
            
            # Parse result
            if isinstance(result, bool):
                valid = result
                errors = [] if valid else ["Validation failed"]
            elif isinstance(result, tuple) and len(result) == 2:
                valid, errors = result
            else:
                valid = bool(result)
                errors = [] if valid else ["Invalid validation result format"]
            
            if valid:
                self.validations_passed += 1
            else:
                self.validations_failed += 1
            
            return valid, errors
            
        except asyncio.TimeoutError:
            self.validations_failed += 1
            return False, [f"Validation timed out after {self.timeout_seconds}s"]
        
        except Exception as e:
            self.validations_failed += 1
            return False, [f"Validation error: {str(e)}"]


class InvestigationStateManager:
    """
    Comprehensive investigation state management system.
    
    Features:
    - State transition validation and enforcement
    - State history tracking and audit trail
    - Multi-agent state coordination
    - State-based triggers and automation
    - Performance monitoring and analytics
    - State persistence and recovery
    - Rollback and recovery mechanisms
    """
    
    def __init__(
        self,
        enable_validation: bool = True,
        enable_history: bool = True,
        max_history_size: int = 1000,
        state_timeout_seconds: int = 3600,
        enable_persistence: bool = True,
        event_bus: Optional[ICEEventBus] = None
    ):
        """Initialize state manager"""
        
        self.enable_validation = enable_validation
        self.enable_history = enable_history
        self.max_history_size = max_history_size
        self.state_timeout_seconds = state_timeout_seconds
        self.enable_persistence = enable_persistence
        
        # Event bus integration
        self.event_bus = event_bus or get_event_bus()
        
        # Investigation state tracking
        self.investigation_states: Dict[str, InvestigationState] = {}
        self.investigation_data: Dict[str, Dict[str, Any]] = {}
        self.state_timestamps: Dict[str, datetime] = {}
        
        # State history
        self.state_history: Dict[str, List[StateTransition]] = defaultdict(list)
        self.transition_index: Dict[str, StateTransition] = {}
        
        # Validation system
        self.validators: Dict[str, StateValidator] = {}
        self.validation_enabled_transitions: Set[tuple] = set()
        
        # State transition rules
        self.allowed_transitions: Dict[InvestigationState, Set[InvestigationState]] = {
            InvestigationState.CREATED: {InvestigationState.INITIALIZING},
            InvestigationState.INITIALIZING: {InvestigationState.INITIALIZED, InvestigationState.ERROR},
            InvestigationState.INITIALIZED: {InvestigationState.STARTING, InvestigationState.CANCELLED},
            InvestigationState.STARTING: {InvestigationState.RUNNING, InvestigationState.ERROR},
            InvestigationState.RUNNING: {
                InvestigationState.ANALYZING, InvestigationState.PROCESSING, 
                InvestigationState.COORDINATING, InvestigationState.PAUSING,
                InvestigationState.VALIDATING, InvestigationState.COMPLETING,
                InvestigationState.ERROR, InvestigationState.TIMEOUT
            },
            InvestigationState.ANALYZING: {
                InvestigationState.RUNNING, InvestigationState.PROCESSING,
                InvestigationState.VALIDATING, InvestigationState.ERROR
            },
            InvestigationState.PROCESSING: {
                InvestigationState.RUNNING, InvestigationState.ANALYZING,
                InvestigationState.COORDINATING, InvestigationState.VALIDATING,
                InvestigationState.ERROR
            },
            InvestigationState.COORDINATING: {
                InvestigationState.RUNNING, InvestigationState.PROCESSING,
                InvestigationState.ERROR
            },
            InvestigationState.PAUSING: {InvestigationState.PAUSED, InvestigationState.ERROR},
            InvestigationState.PAUSED: {InvestigationState.RESUMING, InvestigationState.CANCELLED},
            InvestigationState.RESUMING: {InvestigationState.RUNNING, InvestigationState.ERROR},
            InvestigationState.VALIDATING: {
                InvestigationState.RUNNING, InvestigationState.OPTIMIZING,
                InvestigationState.COMPLETING, InvestigationState.ERROR
            },
            InvestigationState.OPTIMIZING: {
                InvestigationState.RUNNING, InvestigationState.VALIDATING,
                InvestigationState.COMPLETING, InvestigationState.ERROR
            },
            InvestigationState.COMPLETING: {InvestigationState.COMPLETED, InvestigationState.ERROR},
            InvestigationState.ERROR: {
                InvestigationState.RUNNING, InvestigationState.FAILED,
                InvestigationState.CANCELLED
            },
            InvestigationState.TIMEOUT: {
                InvestigationState.RUNNING, InvestigationState.FAILED,
                InvestigationState.CANCELLED
            },
            InvestigationState.FAILED: {InvestigationState.ARCHIVED},
            InvestigationState.COMPLETED: {InvestigationState.ARCHIVED},
            InvestigationState.CANCELLED: {InvestigationState.ARCHIVED},
            InvestigationState.ARCHIVED: set()  # Terminal state
        }
        
        # State automation triggers
        self.state_triggers: Dict[InvestigationState, List[Callable]] = defaultdict(list)
        
        # Statistics
        self.stats = {
            'investigations_created': 0,
            'state_transitions': 0,
            'validation_failures': 0,
            'state_timeouts': 0,
            'start_time': datetime.now()
        }
        
        self.logger = logging.getLogger(f"{__name__}.state_manager")
        
        # Initialize default validators
        self._initialize_default_validators()
    
    async def create_investigation(
        self,
        investigation_id: str,
        initial_data: Dict[str, Any],
        entity_id: Optional[str] = None,
        entity_type: Optional[str] = None
    ) -> bool:
        """Create a new investigation"""
        
        try:
            if investigation_id in self.investigation_states:
                self.logger.warning(f"Investigation {investigation_id} already exists")
                return False
            
            # Initialize investigation
            self.investigation_states[investigation_id] = InvestigationState.CREATED
            self.investigation_data[investigation_id] = {
                'investigation_id': investigation_id,
                'entity_id': entity_id,
                'entity_type': entity_type,
                'created_at': datetime.now().isoformat(),
                'created_by': initial_data.get('created_by', 'system'),
                **initial_data
            }
            self.state_timestamps[investigation_id] = datetime.now()
            
            # Create initial state history entry
            if self.enable_history:
                initial_transition = StateTransition(
                    transition_id=f"{investigation_id}_initial",
                    from_state=None,
                    to_state=InvestigationState.CREATED,
                    triggered_by=initial_data.get('created_by', 'system'),
                    trigger_reason="Investigation created"
                )
                self.state_history[investigation_id].append(initial_transition)
                self.transition_index[initial_transition.transition_id] = initial_transition
            
            # Update statistics
            self.stats['investigations_created'] += 1
            
            # Publish creation event
            await self.event_bus.publish(
                ICEEventType.INVESTIGATION_STARTED,
                {
                    'investigation_id': investigation_id,
                    'entity_id': entity_id,
                    'entity_type': entity_type,
                    'initial_state': InvestigationState.CREATED.value
                },
                investigation_id=investigation_id
            )
            
            self.logger.info(f"Created investigation {investigation_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create investigation {investigation_id}: {str(e)}")
            return False
    
    async def transition_state(
        self,
        investigation_id: str,
        to_state: InvestigationState,
        triggered_by: str = "system",
        trigger_reason: str = "",
        transition_data: Optional[Dict[str, Any]] = None,
        force: bool = False
    ) -> bool:
        """Transition investigation state"""
        
        try:
            if investigation_id not in self.investigation_states:
                self.logger.error(f"Investigation {investigation_id} not found")
                return False
            
            from_state = self.investigation_states[investigation_id]
            
            # Check if transition is allowed
            if not force and not self._is_transition_allowed(from_state, to_state):
                self.logger.error(f"Transition from {from_state.value} to {to_state.value} not allowed")
                return False
            
            # Create transition object
            transition = StateTransition(
                transition_id=f"{investigation_id}_{from_state.value}_{to_state.value}_{int(datetime.now().timestamp())}",
                from_state=from_state,
                to_state=to_state,
                triggered_by=triggered_by,
                trigger_reason=trigger_reason,
                transition_data=transition_data or {}
            )
            
            # Validate transition
            if self.enable_validation and not force:
                validation_passed, validation_errors = await self._validate_transition(
                    investigation_id, from_state, to_state, transition_data or {}
                )
                
                transition.validation_passed = validation_passed
                transition.validation_errors = validation_errors
                
                if not validation_passed:
                    self.logger.error(f"Transition validation failed: {validation_errors}")
                    self.stats['validation_failures'] += 1
                    return False
            
            # Perform state transition
            start_time = datetime.now()
            
            # Update state
            self.investigation_states[investigation_id] = to_state
            self.state_timestamps[investigation_id] = start_time
            
            # Calculate transition duration
            if self.enable_history and self.state_history[investigation_id]:
                last_transition = self.state_history[investigation_id][-1]
                transition.duration_seconds = (start_time - last_transition.timestamp).total_seconds()
            
            # Add to history
            if self.enable_history:
                self.state_history[investigation_id].append(transition)
                self.transition_index[transition.transition_id] = transition
                
                # Maintain history size
                if len(self.state_history[investigation_id]) > self.max_history_size:
                    old_transition = self.state_history[investigation_id].pop(0)
                    self.transition_index.pop(old_transition.transition_id, None)
            
            # Update statistics
            self.stats['state_transitions'] += 1
            
            # Publish state change event
            event_type = self._get_event_type_for_state(to_state)
            await self.event_bus.publish(
                event_type,
                {
                    'investigation_id': investigation_id,
                    'from_state': from_state.value,
                    'to_state': to_state.value,
                    'triggered_by': triggered_by,
                    'trigger_reason': trigger_reason,
                    'transition_id': transition.transition_id
                },
                investigation_id=investigation_id
            )
            
            # Execute state triggers
            await self._execute_state_triggers(investigation_id, to_state)
            
            self.logger.info(f"Investigation {investigation_id} transitioned from {from_state.value} to {to_state.value}")
            return True
            
        except Exception as e:
            self.logger.error(f"State transition failed for {investigation_id}: {str(e)}")
            return False
    
    async def update_investigation_data(
        self,
        investigation_id: str,
        data_updates: Dict[str, Any],
        merge: bool = True
    ) -> bool:
        """Update investigation data"""
        
        try:
            if investigation_id not in self.investigation_data:
                self.logger.error(f"Investigation {investigation_id} not found")
                return False
            
            if merge:
                self.investigation_data[investigation_id].update(data_updates)
            else:
                # Preserve core fields
                core_fields = ['investigation_id', 'created_at', 'created_by']
                preserved_data = {
                    k: v for k, v in self.investigation_data[investigation_id].items()
                    if k in core_fields
                }
                self.investigation_data[investigation_id] = {**preserved_data, **data_updates}
            
            # Add update timestamp
            self.investigation_data[investigation_id]['last_updated'] = datetime.now().isoformat()
            
            self.logger.debug(f"Updated data for investigation {investigation_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to update investigation data for {investigation_id}: {str(e)}")
            return False
    
    def get_investigation_state(self, investigation_id: str) -> Optional[InvestigationState]:
        """Get current investigation state"""
        return self.investigation_states.get(investigation_id)
    
    def get_investigation_data(self, investigation_id: str) -> Optional[Dict[str, Any]]:
        """Get investigation data"""
        return self.investigation_data.get(investigation_id)
    
    def get_investigation_history(
        self,
        investigation_id: str,
        limit: Optional[int] = None
    ) -> List[StateTransition]:
        """Get investigation state history"""
        
        history = self.state_history.get(investigation_id, [])
        
        if limit:
            return history[-limit:]
        return history
    
    def add_validator(self, validator: StateValidator) -> bool:
        """Add state validator"""
        
        try:
            self.validators[validator.validator_id] = validator
            
            # Update validation-enabled transitions
            if validator.applicable_transitions:
                self.validation_enabled_transitions.update(validator.applicable_transitions)
            elif validator.applicable_states:
                # Add all possible transitions involving these states
                for state in validator.applicable_states:
                    if state in self.allowed_transitions:
                        for to_state in self.allowed_transitions[state]:
                            self.validation_enabled_transitions.add((state, to_state))
            
            self.logger.info(f"Added state validator {validator.validator_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to add validator {validator.validator_id}: {str(e)}")
            return False
    
    def remove_validator(self, validator_id: str) -> bool:
        """Remove state validator"""
        
        if validator_id in self.validators:
            del self.validators[validator_id]
            self.logger.info(f"Removed state validator {validator_id}")
            return True
        
        return False
    
    def add_state_trigger(
        self,
        state: InvestigationState,
        trigger_func: Callable[[str, Dict[str, Any]], Any]
    ) -> None:
        """Add trigger function for state"""
        self.state_triggers[state].append(trigger_func)
    
    def _is_transition_allowed(
        self,
        from_state: InvestigationState,
        to_state: InvestigationState
    ) -> bool:
        """Check if state transition is allowed"""
        
        allowed_states = self.allowed_transitions.get(from_state, set())
        return to_state in allowed_states
    
    async def _validate_transition(
        self,
        investigation_id: str,
        from_state: InvestigationState,
        to_state: InvestigationState,
        context: Dict[str, Any]
    ) -> tuple[bool, List[str]]:
        """Validate state transition"""
        
        investigation_data = self.investigation_data.get(investigation_id, {})
        all_errors = []
        validation_passed = True
        
        # Find applicable validators
        applicable_validators = [
            validator for validator in self.validators.values()
            if validator.is_applicable(from_state, to_state)
        ]
        
        # Sort by priority
        applicable_validators.sort(key=lambda v: v.priority)
        
        # Run validations
        for validator in applicable_validators:
            try:
                valid, errors = await validator.validate(
                    investigation_data, from_state, to_state, context
                )
                
                if not valid:
                    all_errors.extend(errors)
                    
                    if validator.required:
                        validation_passed = False
                        self.logger.error(f"Required validator {validator.validator_id} failed: {errors}")
                
            except Exception as e:
                error_msg = f"Validator {validator.validator_id} error: {str(e)}"
                all_errors.append(error_msg)
                
                if validator.required:
                    validation_passed = False
                    self.logger.error(error_msg)
        
        return validation_passed, all_errors
    
    def _get_event_type_for_state(self, state: InvestigationState) -> ICEEventType:
        """Get appropriate event type for state"""
        
        state_event_map = {
            InvestigationState.STARTING: ICEEventType.INVESTIGATION_STARTED,
            InvestigationState.COMPLETED: ICEEventType.INVESTIGATION_COMPLETED,
            InvestigationState.FAILED: ICEEventType.INVESTIGATION_FAILED,
            InvestigationState.PAUSED: ICEEventType.INVESTIGATION_PAUSED,
            InvestigationState.RESUMING: ICEEventType.INVESTIGATION_RESUMED,
            InvestigationState.ERROR: ICEEventType.ERROR_OCCURRED,
            InvestigationState.TIMEOUT: ICEEventType.ERROR_OCCURRED
        }
        
        return state_event_map.get(state, ICEEventType.CUSTOM_EVENT)
    
    async def _execute_state_triggers(
        self,
        investigation_id: str,
        state: InvestigationState
    ) -> None:
        """Execute triggers for state"""
        
        triggers = self.state_triggers.get(state, [])
        investigation_data = self.investigation_data.get(investigation_id, {})
        
        for trigger in triggers:
            try:
                if asyncio.iscoroutinefunction(trigger):
                    await trigger(investigation_id, investigation_data)
                else:
                    await asyncio.get_event_loop().run_in_executor(
                        None, trigger, investigation_id, investigation_data
                    )
            except Exception as e:
                self.logger.error(f"State trigger failed for {state.value}: {str(e)}")
    
    def _initialize_default_validators(self) -> None:
        """Initialize default state validators"""
        
        # Required data validator
        async def validate_required_data(
            investigation_data: Dict[str, Any],
            from_state: InvestigationState,
            to_state: InvestigationState,
            context: Dict[str, Any]
        ) -> tuple[bool, List[str]]:
            
            errors = []
            
            # Check required fields based on target state
            if to_state == InvestigationState.RUNNING:
                required_fields = ['investigation_id', 'entity_id']
                for field in required_fields:
                    if field not in investigation_data or not investigation_data[field]:
                        errors.append(f"Required field missing: {field}")
            
            return len(errors) == 0, errors
        
        self.add_validator(StateValidator(
            validator_id="required_data",
            name="Required Data Validator",
            validator_func=validate_required_data,
            applicable_states={InvestigationState.RUNNING},
            required=True
        ))
        
        # Timeout validator
        async def validate_state_timeout(
            investigation_data: Dict[str, Any],
            from_state: InvestigationState,
            to_state: InvestigationState,
            context: Dict[str, Any]
        ) -> tuple[bool, List[str]]:
            
            investigation_id = investigation_data.get('investigation_id')
            if not investigation_id or investigation_id not in self.state_timestamps:
                return True, []
            
            state_duration = (datetime.now() - self.state_timestamps[investigation_id]).total_seconds()
            
            if state_duration > self.state_timeout_seconds:
                return False, [f"State timeout: {from_state.value} lasted {state_duration}s"]
            
            return True, []
        
        self.add_validator(StateValidator(
            validator_id="state_timeout",
            name="State Timeout Validator",
            validator_func=validate_state_timeout,
            applicable_transitions={(InvestigationState.RUNNING, InvestigationState.TIMEOUT)},
            required=False
        ))
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get state manager statistics"""
        
        uptime = (datetime.now() - self.stats['start_time']).total_seconds()
        
        # Calculate state distribution
        state_distribution = defaultdict(int)
        for state in self.investigation_states.values():
            state_distribution[state.value] += 1
        
        return {
            'manager_status': {
                'uptime_seconds': uptime,
                'active_investigations': len(self.investigation_states),
                'total_transitions': len(self.transition_index),
                'validators_registered': len(self.validators)
            },
            'investigation_stats': {
                'investigations_created': self.stats['investigations_created'],
                'state_transitions': self.stats['state_transitions'],
                'validation_failures': self.stats['validation_failures'],
                'state_timeouts': self.stats['state_timeouts'],
                'transitions_per_hour': self.stats['state_transitions'] / (uptime / 3600) if uptime > 0 else 0
            },
            'state_distribution': dict(state_distribution),
            'validator_stats': {
                validator_id: {
                    'validations_performed': validator.validations_performed,
                    'validations_passed': validator.validations_passed,
                    'validations_failed': validator.validations_failed,
                    'last_validation': validator.last_validation.isoformat() if validator.last_validation else None
                }
                for validator_id, validator in self.validators.items()
            }
        }
    
    async def cleanup_completed_investigations(self, retention_days: int = 30) -> int:
        """Clean up old completed investigations"""
        
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        cleaned_count = 0
        
        completed_states = {InvestigationState.COMPLETED, InvestigationState.FAILED, InvestigationState.ARCHIVED}
        
        investigations_to_clean = []
        for investigation_id, state in self.investigation_states.items():
            if state in completed_states:
                state_timestamp = self.state_timestamps.get(investigation_id)
                if state_timestamp and state_timestamp < cutoff_date:
                    investigations_to_clean.append(investigation_id)
        
        for investigation_id in investigations_to_clean:
            # Remove from all tracking structures
            self.investigation_states.pop(investigation_id, None)
            self.investigation_data.pop(investigation_id, None)
            self.state_timestamps.pop(investigation_id, None)
            
            # Clean history
            history = self.state_history.pop(investigation_id, [])
            for transition in history:
                self.transition_index.pop(transition.transition_id, None)
            
            cleaned_count += 1
        
        if cleaned_count > 0:
            self.logger.info(f"Cleaned up {cleaned_count} completed investigations")
        
        return cleaned_count


# Global state manager instance
_state_manager: Optional[InvestigationStateManager] = None


def get_state_manager() -> InvestigationStateManager:
    """Get the global investigation state manager instance"""
    global _state_manager
    
    if _state_manager is None:
        _state_manager = InvestigationStateManager()
    
    return _state_manager