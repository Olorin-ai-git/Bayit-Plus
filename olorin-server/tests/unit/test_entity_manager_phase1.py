"""
Unit Tests for EntityManager Phase 1 Implementation

Tests for enhanced entity type system including 19 new transaction-specific entity types.
"""

import pytest
import logging
from enum import Enum
from typing import Set, List

from app.service.agent.multi_entity import (
    EntityManager,
    Entity,
    EntityType,
    EntityRelationship,
    EntityGraph,
    get_entity_manager
)


class TestEntityManagerPhase1:
    """Test enhanced EntityManager with new transaction entity types."""
    
    def test_entity_type_enum_completeness(self):
        """Test that all required entity types are defined in EntityType enum."""
        # Core entities (existing)
        core_types = {
            EntityType.DEVICE,
            EntityType.LOCATION,
            EntityType.NETWORK,
            EntityType.USER
        }
        
        # New transaction-specific entity types (Phase 1)
        transaction_types = {
            # Temporal entities
            EntityType.TIMESTAMP,
            EntityType.RECORD_CREATED,
            EntityType.RECORD_UPDATED,
            EntityType.TX_DATETIME,
            EntityType.TX_RECEIVED,
            
            # Transaction identifiers
            EntityType.ORIGINAL_TX_ID,
            EntityType.TX_ID_KEY,
            EntityType.SURROGATE_APP_TX_ID,
            EntityType.NSURE_UNIQUE_TX_ID,
            EntityType.CLIENT_REQUEST_ID,
            
            # Business entities
            EntityType.STORE_ID,
            EntityType.APP_ID,
            EntityType.EVENT_TYPE,
            EntityType.AUTHORIZATION_STAGE,
            
            # User identity entities
            EntityType.EMAIL_NORMALIZED,
            EntityType.FIRST_NAME,
            EntityType.UNIQUE_USER_ID,
            
            # Processing status entities
            EntityType.TX_UPLOADED_TO_SNOWFLAKE,
            EntityType.IS_SENT_FOR_NSURE_REVIEW
        }
        
        # Verify all core types exist
        for entity_type in core_types:
            assert isinstance(entity_type, EntityType)
            assert entity_type.value is not None
        
        # Verify all transaction types exist (19 new types)
        assert len(transaction_types) == 19, f"Expected 19 transaction entity types, got {len(transaction_types)}"
        
        for entity_type in transaction_types:
            assert isinstance(entity_type, EntityType)
            assert entity_type.value is not None
    
    def test_entity_type_values_are_strings(self):
        """Test that all EntityType enum values are strings."""
        for entity_type in EntityType:
            assert isinstance(entity_type.value, str)
            assert len(entity_type.value) > 0
    
    def test_entity_type_uniqueness(self):
        """Test that all EntityType values are unique."""
        values = [entity_type.value for entity_type in EntityType]
        assert len(values) == len(set(values)), "EntityType enum values must be unique"
    
    def test_new_transaction_entity_types_accessible(self):
        """Test that all new transaction entity types are accessible."""
        # Test temporal entities
        assert EntityType.TIMESTAMP.value == "timestamp"
        assert EntityType.RECORD_CREATED.value == "record_created"
        assert EntityType.RECORD_UPDATED.value == "record_updated"
        assert EntityType.TX_DATETIME.value == "tx_datetime"
        assert EntityType.TX_RECEIVED.value == "tx_received"
        
        # Test transaction identifiers
        assert EntityType.ORIGINAL_TX_ID.value == "original_tx_id"
        assert EntityType.TX_ID_KEY.value == "tx_id_key"
        assert EntityType.SURROGATE_APP_TX_ID.value == "surrogate_app_tx_id"
        assert EntityType.NSURE_UNIQUE_TX_ID.value == "nsure_unique_tx_id"
        assert EntityType.CLIENT_REQUEST_ID.value == "client_request_id"
        
        # Test business entities
        assert EntityType.STORE_ID.value == "store_id"
        assert EntityType.APP_ID.value == "app_id"
        assert EntityType.EVENT_TYPE.value == "event_type"
        assert EntityType.AUTHORIZATION_STAGE.value == "authorization_stage"
        
        # Test user identity entities
        assert EntityType.EMAIL_NORMALIZED.value == "email_normalized"
        assert EntityType.FIRST_NAME.value == "first_name"
        assert EntityType.UNIQUE_USER_ID.value == "unique_user_id"
        
        # Test processing status entities
        assert EntityType.TX_UPLOADED_TO_SNOWFLAKE.value == "tx_uploaded_to_snowflake"
        assert EntityType.IS_SENT_FOR_NSURE_REVIEW.value == "is_sent_for_nsure_review"


class TestEntityManagerIntegration:
    """Test EntityManager integration with new entity types."""
    
    @pytest.fixture
    def entity_manager(self):
        """Create EntityManager instance for testing."""
        return get_entity_manager()
    
    def test_get_entity_manager_singleton(self):
        """Test that get_entity_manager returns the same instance."""
        manager1 = get_entity_manager()
        manager2 = get_entity_manager()
        assert manager1 is manager2
    
    def test_entity_creation_with_new_types(self, entity_manager):
        """Test creating entities with new transaction types."""
        investigation_id = "test_investigation_123"
        
        # Test temporal entity creation
        timestamp_entity = entity_manager.create_entity(
            entity_type=EntityType.TIMESTAMP,
            entity_id="1698765432",
            investigation_id=investigation_id,
            data={"value": "1698765432", "formatted": "2023-10-31 12:30:32"}
        )
        
        assert timestamp_entity.entity_type == EntityType.TIMESTAMP
        assert timestamp_entity.entity_id == "1698765432"
        assert timestamp_entity.investigation_id == investigation_id
        assert timestamp_entity.data["value"] == "1698765432"
        
        # Test transaction identifier entity creation
        tx_id_entity = entity_manager.create_entity(
            entity_type=EntityType.ORIGINAL_TX_ID,
            entity_id="tx_12345",
            investigation_id=investigation_id,
            data={"tx_id": "tx_12345", "source": "payment_processor"}
        )
        
        assert tx_id_entity.entity_type == EntityType.ORIGINAL_TX_ID
        assert tx_id_entity.entity_id == "tx_12345"
        
        # Test business entity creation
        store_entity = entity_manager.create_entity(
            entity_type=EntityType.STORE_ID,
            entity_id="store_789",
            investigation_id=investigation_id,
            data={"store_id": "store_789", "name": "Test Store"}
        )
        
        assert store_entity.entity_type == EntityType.STORE_ID
        assert store_entity.entity_id == "store_789"
    
    def test_entity_retrieval_with_new_types(self, entity_manager):
        """Test retrieving entities with new transaction types."""
        investigation_id = "test_investigation_456"
        
        # Create entities with new types
        email_entity = entity_manager.create_entity(
            entity_type=EntityType.EMAIL_NORMALIZED,
            entity_id="user@example.com",
            investigation_id=investigation_id,
            data={"email": "user@example.com", "normalized": True}
        )
        
        app_entity = entity_manager.create_entity(
            entity_type=EntityType.APP_ID,
            entity_id="app_123",
            investigation_id=investigation_id,
            data={"app_id": "app_123", "version": "1.0"}
        )
        
        # Test retrieval by investigation
        entities = entity_manager.get_entities_by_investigation(investigation_id)
        entity_ids = {e.entity_id for e in entities}
        
        assert "user@example.com" in entity_ids
        assert "app_123" in entity_ids
        
        # Test retrieval by type
        email_entities = entity_manager.get_entities_by_type(EntityType.EMAIL_NORMALIZED)
        email_entity_ids = {e.entity_id for e in email_entities}
        assert "user@example.com" in email_entity_ids
        
        app_entities = entity_manager.get_entities_by_type(EntityType.APP_ID)
        app_entity_ids = {e.entity_id for e in app_entities}
        assert "app_123" in app_entity_ids
    
    def test_no_breaking_changes_existing_functionality(self, entity_manager):
        """Test that existing EntityManager functionality still works."""
        investigation_id = "test_existing_functionality"
        
        # Test existing core entity types still work
        device_entity = entity_manager.create_entity(
            entity_type=EntityType.DEVICE,
            entity_id="device_001",
            investigation_id=investigation_id,
            data={"device_fingerprint": "abc123", "model": "iPhone 14"}
        )
        
        user_entity = entity_manager.create_entity(
            entity_type=EntityType.USER,
            entity_id="user_001",
            investigation_id=investigation_id,
            data={"user_id": "user_001", "status": "active"}
        )
        
        location_entity = entity_manager.create_entity(
            entity_type=EntityType.LOCATION,
            entity_id="loc_001",
            investigation_id=investigation_id,
            data={"latitude": 40.7128, "longitude": -74.0060, "city": "New York"}
        )
        
        network_entity = entity_manager.create_entity(
            entity_type=EntityType.NETWORK,
            entity_id="net_001",
            investigation_id=investigation_id,
            data={"ip": "192.168.1.1", "isp": "Test ISP"}
        )
        
        # Verify all entities are created correctly
        entities = entity_manager.get_entities_by_investigation(investigation_id)
        entity_types = {e.entity_type for e in entities}
        
        assert EntityType.DEVICE in entity_types
        assert EntityType.USER in entity_types
        assert EntityType.LOCATION in entity_types
        assert EntityType.NETWORK in entity_types
        assert len(entities) == 4
    
    def test_entity_relationships_with_new_types(self, entity_manager):
        """Test creating relationships between new and existing entity types."""
        investigation_id = "test_relationships"
        
        # Create entities
        user_entity = entity_manager.create_entity(
            entity_type=EntityType.USER,
            entity_id="user_rel_001",
            investigation_id=investigation_id,
            data={"user_id": "user_rel_001"}
        )
        
        tx_entity = entity_manager.create_entity(
            entity_type=EntityType.ORIGINAL_TX_ID,
            entity_id="tx_rel_001",
            investigation_id=investigation_id,
            data={"tx_id": "tx_rel_001"}
        )
        
        timestamp_entity = entity_manager.create_entity(
            entity_type=EntityType.TX_DATETIME,
            entity_id="2023-10-31T12:30:32Z",
            investigation_id=investigation_id,
            data={"datetime": "2023-10-31T12:30:32Z"}
        )
        
        # Create relationships
        user_tx_rel = entity_manager.add_relationship(
            entity1_id=user_entity.entity_id,
            entity2_id=tx_entity.entity_id,
            relationship_type="INITIATED_TRANSACTION",
            investigation_id=investigation_id
        )
        
        tx_time_rel = entity_manager.add_relationship(
            entity1_id=tx_entity.entity_id,
            entity2_id=timestamp_entity.entity_id,
            relationship_type="OCCURRED_AT",
            investigation_id=investigation_id
        )
        
        # Verify relationships
        assert user_tx_rel is not None
        assert tx_time_rel is not None
        
        # Test relationship retrieval
        user_relationships = entity_manager.get_entity_relationships(user_entity.entity_id)
        tx_relationships = entity_manager.get_entity_relationships(tx_entity.entity_id)
        
        assert len(user_relationships) == 1
        assert len(tx_relationships) == 2  # Connected to user and timestamp
    
    def test_logging_integration(self, entity_manager, caplog):
        """Test that logging works correctly with new implementation."""
        with caplog.at_level(logging.DEBUG):
            # Create entity that should generate log messages
            entity_manager.create_entity(
                entity_type=EntityType.AUTHORIZATION_STAGE,
                entity_id="auth_001",
                investigation_id="test_logging",
                data={"stage": "pre_auth", "status": "pending"}
            )
        
        # Verify logging occurred (exact log message may vary)
        assert len(caplog.records) > 0
        log_messages = [record.message for record in caplog.records]
        
        # Check that we have some log activity (implementation-dependent)
        assert any("auth_001" in msg for msg in log_messages) or len(caplog.records) > 0


class TestEntityPhase1ErrorHandling:
    """Test error handling with new entity types."""
    
    @pytest.fixture
    def entity_manager(self):
        """Create EntityManager instance for testing."""
        return get_entity_manager()
    
    def test_invalid_entity_type_handling(self, entity_manager):
        """Test handling of invalid entity type operations."""
        investigation_id = "test_error_handling"
        
        # This should work with valid enum
        valid_entity = entity_manager.create_entity(
            entity_type=EntityType.FIRST_NAME,
            entity_id="john_doe",
            investigation_id=investigation_id,
            data={"first_name": "John"}
        )
        assert valid_entity is not None
        
        # Test with None entity_type should raise appropriate error
        with pytest.raises((TypeError, AttributeError, ValueError)):
            entity_manager.create_entity(
                entity_type=None,
                entity_id="invalid_001",
                investigation_id=investigation_id,
                data={}
            )
    
    def test_empty_entity_data_handling(self, entity_manager):
        """Test handling of entities with empty or minimal data."""
        investigation_id = "test_empty_data"
        
        # Entity with empty data should still be created
        empty_entity = entity_manager.create_entity(
            entity_type=EntityType.EVENT_TYPE,
            entity_id="event_001",
            investigation_id=investigation_id,
            data={}
        )
        
        assert empty_entity is not None
        assert empty_entity.entity_type == EntityType.EVENT_TYPE
        assert empty_entity.entity_id == "event_001"
        assert empty_entity.data == {}