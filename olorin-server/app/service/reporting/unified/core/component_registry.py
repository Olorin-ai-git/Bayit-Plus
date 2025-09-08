"""
Component registry for managing HTML report components.

This module provides a registry system for discovering, registering, and
managing report components in the unified HTML report generator.
"""

from typing import Dict, List, Optional, Type, Any
import importlib
import inspect
from pathlib import Path

from ..components.base_component import BaseComponent, ComponentConfig


class ComponentRegistry:
    """
    Registry for managing and organizing report components.
    
    This class handles component registration, discovery, ordering, and
    provides methods to retrieve components for report generation.
    """
    
    def __init__(self):
        """Initialize empty component registry."""
        self._components: Dict[str, BaseComponent] = {}
        self._component_order: List[str] = []
    
    def register_component(self, component: BaseComponent) -> None:
        """
        Register a component instance.
        
        Args:
            component: The component instance to register
        """
        component_id = component.config.component_id
        self._components[component_id] = component
        
        # Insert component in order based on its order value
        order = component.config.order
        inserted = False
        
        for i, existing_id in enumerate(self._component_order):
            existing_order = self._components[existing_id].config.order
            if order < existing_order:
                self._component_order.insert(i, component_id)
                inserted = True
                break
        
        if not inserted:
            self._component_order.append(component_id)
    
    def register_component_class(
        self, 
        component_class: Type[BaseComponent],
        config: Optional[ComponentConfig] = None
    ) -> None:
        """
        Register a component class with optional configuration.
        
        Args:
            component_class: The component class to instantiate and register
            config: Optional configuration for the component
        """
        component = component_class(config)
        self.register_component(component)
    
    def unregister_component(self, component_id: str) -> None:
        """
        Unregister a component by ID.
        
        Args:
            component_id: The ID of the component to remove
        """
        if component_id in self._components:
            del self._components[component_id]
            self._component_order.remove(component_id)
    
    def get_component(self, component_id: str) -> Optional[BaseComponent]:
        """
        Get a component by ID.
        
        Args:
            component_id: The component identifier
            
        Returns:
            BaseComponent: The component instance, or None if not found
        """
        return self._components.get(component_id)
    
    def get_all_components(self, enabled_only: bool = True) -> List[BaseComponent]:
        """
        Get all registered components in order.
        
        Args:
            enabled_only: If True, only return enabled components
            
        Returns:
            List[BaseComponent]: Ordered list of components
        """
        components = []
        for component_id in self._component_order:
            component = self._components[component_id]
            if not enabled_only or component.config.enabled:
                components.append(component)
        return components
    
    def get_enabled_components(self) -> List[BaseComponent]:
        """
        Get all enabled components in order.
        
        Returns:
            List[BaseComponent]: Ordered list of enabled components
        """
        return self.get_all_components(enabled_only=True)
    
    def get_component_ids(self, enabled_only: bool = True) -> List[str]:
        """
        Get list of component IDs in order.
        
        Args:
            enabled_only: If True, only return enabled component IDs
            
        Returns:
            List[str]: Ordered list of component IDs
        """
        if enabled_only:
            return [c.config.component_id for c in self.get_enabled_components()]
        else:
            return self._component_order.copy()
    
    def set_component_enabled(self, component_id: str, enabled: bool) -> None:
        """
        Enable or disable a component.
        
        Args:
            component_id: The component to modify
            enabled: Whether the component should be enabled
        """
        if component_id in self._components:
            self._components[component_id].config.enabled = enabled
    
    def set_component_order(self, component_id: str, new_order: int) -> None:
        """
        Change the order value of a component and reorder the registry.
        
        Args:
            component_id: The component to reorder
            new_order: The new order value
        """
        if component_id not in self._components:
            return
        
        # Update the order in the component config
        self._components[component_id].config.order = new_order
        
        # Remove from current position
        self._component_order.remove(component_id)
        
        # Reinsert in correct position
        inserted = False
        for i, existing_id in enumerate(self._component_order):
            existing_order = self._components[existing_id].config.order
            if new_order < existing_order:
                self._component_order.insert(i, component_id)
                inserted = True
                break
        
        if not inserted:
            self._component_order.append(component_id)
    
    def get_javascript_dependencies(self) -> List[str]:
        """
        Get all JavaScript dependencies from enabled components.
        
        Returns:
            List[str]: Unique list of JavaScript dependencies
        """
        dependencies = set()
        for component in self.get_enabled_components():
            dependencies.update(component.get_javascript_dependencies())
        return list(dependencies)
    
    def get_css_dependencies(self) -> List[str]:
        """
        Get all CSS dependencies from enabled components.
        
        Returns:
            List[str]: Unique list of CSS dependencies
        """
        dependencies = set()
        for component in self.get_enabled_components():
            dependencies.update(component.get_css_dependencies())
        return list(dependencies)
    
    def get_registry_info(self) -> Dict[str, Any]:
        """
        Get information about all registered components.
        
        Returns:
            Dict containing registry metadata and component information
        """
        return {
            "total_components": len(self._components),
            "enabled_components": len(self.get_enabled_components()),
            "component_order": self._component_order.copy(),
            "components": [
                component.get_component_info() 
                for component in self._components.values()
            ]
        }
    
    def auto_discover_components(self, components_package: str = None) -> int:
        """
        Automatically discover and register components from a package.
        
        Args:
            components_package: Package to search for components.
                              Defaults to the components package in this module.
        
        Returns:
            int: Number of components discovered and registered
        """
        if components_package is None:
            components_package = "app.service.reporting.unified.components"
        
        discovered_count = 0
        
        try:
            # Import the components package
            components_module = importlib.import_module(components_package)
            components_path = Path(components_module.__file__).parent
            
            # Scan for Python files in the components directory
            for py_file in components_path.glob("*.py"):
                if py_file.name.startswith("_") or py_file.name == "base_component.py":
                    continue
                
                module_name = f"{components_package}.{py_file.stem}"
                
                try:
                    module = importlib.import_module(module_name)
                    
                    # Find BaseComponent subclasses
                    for name, obj in inspect.getmembers(module, inspect.isclass):
                        if (issubclass(obj, BaseComponent) and 
                            obj is not BaseComponent and 
                            obj.__module__ == module_name):
                            
                            # Register the component with default configuration
                            self.register_component_class(obj)
                            discovered_count += 1
                            
                except ImportError:
                    continue  # Skip modules that can't be imported
                    
        except ImportError:
            pass  # Components package not found
        
        return discovered_count