"""
Transaction Entity Factory

Factory for creating entities from CSV transaction data with automated
column mapping and validation.
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

from .entity_manager import Entity, EntityType, get_entity_manager

logger = get_bridge_logger(__name__)


class TransactionEntityFactory:
    """
    Factory class for creating entities from CSV transaction data.

    Maps CSV columns to appropriate entity types and handles data validation.
    """

    # CSV column to entity type mapping
    CSV_COLUMN_MAPPINGS = {
        # Temporal entities
        "TABLE_RECORD_CREATED_AT": EntityType.RECORD_CREATED,
        "TABLE_RECORD_UPDATED_AT": EntityType.RECORD_UPDATED,
        "TX_DATETIME": EntityType.TX_DATETIME,
        "TX_RECEIVED_DATETIME": EntityType.TX_RECEIVED,
        "TX_TIMESTAMP_MS": EntityType.TIMESTAMP,
        # Transaction identifiers
        "ORIGINAL_TX_ID": EntityType.ORIGINAL_TX_ID,
        "TX_ID_KEY": EntityType.TX_ID_KEY,
        "SURROGATE_APP_TX_ID": EntityType.SURROGATE_APP_TX_ID,
        "NSURE_UNIQUE_TX_ID": EntityType.NSURE_UNIQUE_TX_ID,
        "CLIENT_REQUEST_ID": EntityType.CLIENT_REQUEST_ID,
        # Business entities
        "STORE_ID": EntityType.STORE_ID,
        "APP_ID": EntityType.APP_ID,
        "EVENT_TYPE": EntityType.EVENT_TYPE,
        "AUTHORIZATION_STAGE": EntityType.AUTHORIZATION_STAGE,
        # User identity entities (reuse existing EMAIL)
        "EMAIL": EntityType.EMAIL,
        "EMAIL_NORMALIZED": EntityType.EMAIL_NORMALIZED,
        "FIRST_NAME": EntityType.FIRST_NAME,
        "UNIQUE_USER_ID": EntityType.UNIQUE_USER_ID,
        # Processing status entities
        "TX_UPLOADED_TO_SNOWFLAKE": EntityType.TX_UPLOADED_TO_SNOWFLAKE,
        "IS_SENT_FOR_NSURE_REVIEW": EntityType.IS_SENT_FOR_NSURE_REVIEW,
    }

    def __init__(self):
        self.entity_manager = get_entity_manager()
        self.created_entities = []
        self.validation_errors = []

    async def create_entities_from_csv_row(
        self, row_data: Dict[str, Any], investigation_id: Optional[str] = None
    ) -> List[str]:
        """
        Create entities from a single CSV row.

        Args:
            row_data: Dictionary containing CSV row data
            investigation_id: Optional investigation ID to associate entities with

        Returns:
            List of created entity IDs
        """
        created_entity_ids = []

        for csv_column, entity_type in self.CSV_COLUMN_MAPPINGS.items():
            if csv_column in row_data and row_data[csv_column] is not None:
                value = row_data[csv_column]

                # Skip empty values
                if not str(value).strip():
                    continue

                try:
                    # Create entity with appropriate attributes
                    attributes = {
                        "original_csv_column": csv_column,
                        "raw_value": str(value),
                        "data_type": type(value).__name__,
                        "source": "csv_transaction_data",
                    }

                    # Add timestamp parsing for temporal entities
                    if entity_type in [
                        EntityType.RECORD_CREATED,
                        EntityType.RECORD_UPDATED,
                        EntityType.TX_DATETIME,
                        EntityType.TX_RECEIVED,
                        EntityType.TIMESTAMP,
                    ]:
                        parsed_timestamp = self._parse_timestamp(value)
                        if parsed_timestamp:
                            attributes["parsed_timestamp"] = (
                                parsed_timestamp.isoformat()
                            )

                    # Create entity
                    entity_id = await self.entity_manager.create_entity(
                        entity_type=entity_type,
                        name=f"{entity_type.value}_{str(value)[:50]}",  # Truncate long values
                        attributes=attributes,
                        investigation_id=investigation_id,
                    )

                    created_entity_ids.append(entity_id)
                    self.created_entities.append(entity_id)

                    logger.info(
                        f"Created {entity_type.value} entity {entity_id} from CSV column {csv_column}"
                    )

                except Exception as e:
                    error_msg = f"Failed to create entity for column {csv_column} with value {value}: {str(e)}"
                    logger.error(error_msg)
                    self.validation_errors.append(
                        {"csv_column": csv_column, "value": value, "error": str(e)}
                    )

        return created_entity_ids

    def _parse_timestamp(self, value: Any) -> Optional[datetime]:
        """Parse timestamp from various formats."""
        if isinstance(value, datetime):
            return value

        if isinstance(value, str):
            # Common timestamp formats to try
            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S.%f",
                "%Y-%m-%dT%H:%M:%S.%f",
                "%Y-%m-%dT%H:%M:%SZ",
                "%m/%d/%Y %H:%M:%S",
                "%m-%d-%Y %H:%M:%S",
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue

        return None

    async def create_entities_from_csv_batch(
        self, csv_data: List[Dict[str, Any]], investigation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create entities from a batch of CSV rows.

        Args:
            csv_data: List of dictionaries containing CSV row data
            investigation_id: Optional investigation ID to associate entities with

        Returns:
            Dictionary with creation results and statistics
        """
        start_time = datetime.now()
        all_entity_ids = []

        for i, row_data in enumerate(csv_data):
            try:
                entity_ids = await self.create_entities_from_csv_row(
                    row_data, investigation_id
                )
                all_entity_ids.extend(entity_ids)

                # Log progress for large batches
                if (i + 1) % 100 == 0:
                    logger.info(
                        f"Processed {i + 1} CSV rows, created {len(all_entity_ids)} entities"
                    )

            except Exception as e:
                error_msg = f"Failed to process CSV row {i}: {str(e)}"
                logger.error(error_msg)
                self.validation_errors.append(
                    {
                        "row_index": i,
                        "error": str(e),
                        "row_data": str(row_data)[:200],  # Truncate for logging
                    }
                )

        processing_time = (datetime.now() - start_time).total_seconds()

        return {
            "success": True,
            "total_rows_processed": len(csv_data),
            "total_entities_created": len(all_entity_ids),
            "entity_ids": all_entity_ids,
            "validation_errors": self.validation_errors,
            "processing_time_seconds": processing_time,
            "entities_per_second": (
                len(all_entity_ids) / processing_time if processing_time > 0 else 0
            ),
        }

    def get_statistics(self) -> Dict[str, Any]:
        """Get factory statistics."""
        return {
            "total_entities_created": len(self.created_entities),
            "total_validation_errors": len(self.validation_errors),
            "supported_csv_columns": list(self.CSV_COLUMN_MAPPINGS.keys()),
            "supported_entity_types": [
                et.value for et in self.CSV_COLUMN_MAPPINGS.values()
            ],
        }

    def reset_statistics(self) -> None:
        """Reset factory statistics."""
        self.created_entities = []
        self.validation_errors = []
