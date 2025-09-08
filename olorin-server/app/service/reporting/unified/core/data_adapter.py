"""
Data adapter interface and type definitions.

This module defines the abstract base class for data adapters and the
data source type enumeration for the unified HTML report generator.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List
from pathlib import Path

from .data_structures import UnifiedReportData


class DataSourceType(Enum):
    """Enumeration of supported data source types."""
    TEST_RESULTS = "test_results"
    INVESTIGATION_FOLDER = "investigation_folder"
    RAW_DATA = "raw_data"


class DataAdapter(ABC):
    """
    Abstract base class for data adapters.
    
    Data adapters are responsible for converting different input data formats
    into the standardized UnifiedReportData structure that all components
    can consume.
    """
    
    @abstractmethod
    def adapt_data(self, source: Any) -> UnifiedReportData:
        """
        Convert source data to UnifiedReportData format.
        
        Args:
            source: The source data to adapt (format depends on adapter)
            
        Returns:
            UnifiedReportData: Standardized data structure
            
        Raises:
            ValueError: If source data is invalid or cannot be adapted
            FileNotFoundError: If required files are missing
        """
        pass
    
    @abstractmethod  
    def validate_source(self, source: Any) -> bool:
        """
        Validate that the source data is compatible with this adapter.
        
        Args:
            source: The source data to validate
            
        Returns:
            bool: True if source is valid for this adapter
        """
        pass
    
    @abstractmethod
    def get_supported_data_type(self) -> DataSourceType:
        """
        Get the data source type this adapter supports.
        
        Returns:
            DataSourceType: The data type this adapter handles
        """
        pass
    
    def get_adapter_info(self) -> Dict[str, Any]:
        """
        Get information about this adapter.
        
        Returns:
            Dict containing adapter metadata
        """
        return {
            "name": self.__class__.__name__,
            "data_type": self.get_supported_data_type().value,
            "description": self.__doc__ or "No description available"
        }
    
    def extract_investigation_id(self, source: Any) -> str:
        """
        Extract investigation ID from source data.
        
        Default implementation returns a generic ID.
        Subclasses should override this method.
        
        Args:
            source: The source data
            
        Returns:
            str: Investigation identifier
        """
        return f"investigation_{id(source)}"
    
    def extract_file_paths(self, source: Any) -> List[Path]:
        """
        Extract file paths referenced in the source data.
        
        Default implementation returns empty list.
        Subclasses can override to provide file paths.
        
        Args:
            source: The source data
            
        Returns:
            List[Path]: List of file paths referenced in the data
        """
        return []


class AdapterRegistry:
    """
    Registry for managing data adapters.
    
    This class maintains a registry of available data adapters and provides
    methods to automatically select the appropriate adapter for a given
    data source.
    """
    
    def __init__(self):
        """Initialize empty adapter registry."""
        self._adapters: Dict[DataSourceType, DataAdapter] = {}
    
    def register_adapter(self, adapter: DataAdapter) -> None:
        """
        Register a data adapter.
        
        Args:
            adapter: The adapter instance to register
        """
        data_type = adapter.get_supported_data_type()
        self._adapters[data_type] = adapter
    
    def get_adapter(self, data_type: DataSourceType) -> DataAdapter:
        """
        Get adapter for a specific data type.
        
        Args:
            data_type: The data source type
            
        Returns:
            DataAdapter: The registered adapter
            
        Raises:
            ValueError: If no adapter is registered for the data type
        """
        if data_type not in self._adapters:
            raise ValueError(f"No adapter registered for data type: {data_type.value}")
        
        return self._adapters[data_type]
    
    def auto_detect_adapter(self, source: Any) -> DataAdapter:
        """
        Automatically detect and return the appropriate adapter for source data.
        
        Args:
            source: The source data to analyze
            
        Returns:
            DataAdapter: The appropriate adapter
            
        Raises:
            ValueError: If no suitable adapter is found
        """
        for adapter in self._adapters.values():
            if adapter.validate_source(source):
                return adapter
        
        raise ValueError("No suitable adapter found for the provided data source")
    
    def get_registered_adapters(self) -> List[Dict[str, Any]]:
        """
        Get information about all registered adapters.
        
        Returns:
            List[Dict]: List of adapter information dictionaries
        """
        return [adapter.get_adapter_info() for adapter in self._adapters.values()]