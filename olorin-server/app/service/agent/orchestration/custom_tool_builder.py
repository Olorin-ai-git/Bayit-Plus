from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

"""
Custom Tool Development Framework - Streamlined tool creation for investigation-specific needs.

This module implements Phase 4 of the LangGraph enhancement plan, providing:
- Rapid tool development and deployment
- Automatic tool validation and optimization
- Integration with enhanced ToolExecutor
- Standardized tool patterns and interfaces
- Tool performance monitoring and metrics
"""

import logging
import inspect
import asyncio
from typing import Dict, Any, List, Optional, Callable, Type, Union
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import json

from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel, Field, create_model
from langchain_core.callbacks import CallbackManagerForToolRun, AsyncCallbackManagerForToolRun

logger = logging.getLogger(__name__)


class ToolCategory(Enum):
    """Categories of investigation tools."""
    DATA_EXTRACTION = "data_extraction"
    ANALYSIS = "analysis"
    VALIDATION = "validation"
    ENRICHMENT = "enrichment"
    CORRELATION = "correlation"
    REPORTING = "reporting"
    INTEGRATION = "integration"
    MONITORING = "monitoring"


@dataclass
class ToolSpecification:
    """Specification for creating a custom tool."""
    name: str
    description: str
    category: ToolCategory
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    implementation: Optional[Callable] = None
    async_implementation: Optional[Callable] = None
    validation_rules: List[Dict[str, Any]] = field(default_factory=list)
    performance_targets: Dict[str, float] = field(default_factory=dict)
    retry_config: Dict[str, Any] = field(default_factory=dict)
    cache_config: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


class ToolValidator:
    """Validates tool specifications and implementations."""
    
    @staticmethod
    def validate_specification(spec: ToolSpecification) -> List[str]:
        """Validate tool specification completeness and correctness."""
        errors = []
        
        # Name validation
        if not spec.name or not spec.name.replace("_", "").isalnum():
            errors.append("Tool name must be alphanumeric with underscores")
        
        # Description validation
        if not spec.description or len(spec.description) < 10:
            errors.append("Tool description must be at least 10 characters")
        
        # Implementation validation
        if not spec.implementation and not spec.async_implementation:
            errors.append("Tool must have either sync or async implementation")
        
        # Schema validation
        if not spec.input_schema:
            errors.append("Tool must define input schema")
        
        if not spec.output_schema:
            errors.append("Tool must define output schema")
        
        # Performance targets validation
        if spec.performance_targets:
            if "max_latency" in spec.performance_targets:
                if spec.performance_targets["max_latency"] <= 0:
                    errors.append("max_latency must be positive")
            
            if "min_success_rate" in spec.performance_targets:
                rate = spec.performance_targets["min_success_rate"]
                if not 0 <= rate <= 1:
                    errors.append("min_success_rate must be between 0 and 1")
        
        return errors
    
    @staticmethod
    def validate_implementation(spec: ToolSpecification) -> List[str]:
        """Validate tool implementation against specification."""
        errors = []
        
        if spec.implementation:
            # Check function signature
            sig = inspect.signature(spec.implementation)
            params = list(sig.parameters.keys())
            
            # Check if parameters match input schema
            required_params = set(spec.input_schema.get("required", []))
            actual_params = set(params)
            
            missing = required_params - actual_params
            if missing:
                errors.append(f"Implementation missing required parameters: {missing}")
        
        if spec.async_implementation:
            # Check if it's actually async
            if not asyncio.iscoroutinefunction(spec.async_implementation):
                errors.append("async_implementation must be a coroutine function")
        
        return errors


class PerformanceMonitor:
    """Monitors tool performance metrics."""
    
    def __init__(self):
        """Initialize performance monitor."""
        self.metrics: Dict[str, Dict[str, Any]] = {}
    
    def record_execution(self, tool_name: str, duration: float, success: bool, 
                        input_size: int = 0, output_size: int = 0):
        """Record tool execution metrics."""
        if tool_name not in self.metrics:
            self.metrics[tool_name] = {
                "total_executions": 0,
                "successful_executions": 0,
                "failed_executions": 0,
                "total_duration": 0.0,
                "avg_duration": 0.0,
                "max_duration": 0.0,
                "min_duration": float('inf'),
                "avg_input_size": 0,
                "avg_output_size": 0
            }
        
        metrics = self.metrics[tool_name]
        metrics["total_executions"] += 1
        
        if success:
            metrics["successful_executions"] += 1
        else:
            metrics["failed_executions"] += 1
        
        metrics["total_duration"] += duration
        metrics["avg_duration"] = metrics["total_duration"] / max(1, metrics["total_executions"])  # CRITICAL FIX: Division by zero protection
        metrics["max_duration"] = max(metrics["max_duration"], duration)
        metrics["min_duration"] = min(metrics["min_duration"], duration)
        
        # Update size metrics
        total = metrics["total_executions"]
        metrics["avg_input_size"] = ((metrics["avg_input_size"] * (total - 1)) + input_size) / total
        metrics["avg_output_size"] = ((metrics["avg_output_size"] * (total - 1)) + output_size) / total
    
    def get_metrics(self, tool_name: str) -> Dict[str, Any]:
        """Get metrics for a specific tool."""
        return self.metrics.get(tool_name, {})
    
    def check_performance_targets(self, tool_name: str, targets: Dict[str, float]) -> Dict[str, bool]:
        """Check if tool meets performance targets."""
        metrics = self.get_metrics(tool_name)
        results = {}
        
        if not metrics:
            return results
        
        if "max_latency" in targets:
            results["latency_ok"] = metrics["avg_duration"] <= targets["max_latency"]
        
        if "min_success_rate" in targets:
            total = metrics["total_executions"]
            if total > 0:
                success_rate = metrics["successful_executions"] / total
                results["success_rate_ok"] = success_rate >= targets["min_success_rate"]
        
        return results


class InvestigationTool(BaseTool):
    """Custom investigation tool created from specification."""
    
    def __init__(self, spec: ToolSpecification, performance_monitor: Optional[PerformanceMonitor] = None):
        """Initialize investigation tool from specification."""
        self.spec = spec
        self.performance_monitor = performance_monitor or PerformanceMonitor()
        
        # Set base attributes
        self.name = spec.name
        self.description = spec.description
        
        # Create args schema from specification
        self.args_schema = self._create_args_schema(spec.input_schema)
        
        super().__init__()
    
    def _create_args_schema(self, schema: Dict[str, Any]) -> Type[BaseModel]:
        """Create Pydantic model from schema specification."""
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        # Build field definitions
        fields = {}
        for name, prop in properties.items():
            field_type = self._get_python_type(prop.get("type", "string"))
            description = prop.get("description", "")
            
            if name in required:
                fields[name] = (field_type, Field(..., description=description))
            else:
                default = prop.get("default", None)
                fields[name] = (field_type, Field(default, description=description))
        
        # Create dynamic model
        return create_model(f"{self.name}_Args", **fields)
    
    def _get_python_type(self, json_type: str) -> Type:
        """Convert JSON schema type to Python type."""
        type_map = {
            "string": str,
            "number": float,
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict
        }
        return type_map.get(json_type, Any)
    
    def _run(self, *args, **kwargs) -> str:
        """Run the tool synchronously."""
        start_time = datetime.now()
        success = False
        
        try:
            if self.spec.implementation:
                result = self.spec.implementation(**kwargs)
                success = True
                return json.dumps(result) if not isinstance(result, str) else result
            else:
                raise NotImplementedError("Synchronous implementation not provided")
        
        except Exception as e:
            logger.error(f"Tool {self.name} execution failed: {e}")
            return f"Error: {str(e)}"
        
        finally:
            duration = (datetime.now() - start_time).total_seconds()
            input_size = len(json.dumps(kwargs))
            output_size = len(json.dumps(result)) if success else 0
            
            self.performance_monitor.record_execution(
                self.name, duration, success, input_size, output_size
            )
    
    async def _arun(self, *args, **kwargs) -> str:
        """Run the tool asynchronously."""
        start_time = datetime.now()
        success = False
        result = None
        
        try:
            if self.spec.async_implementation:
                result = await self.spec.async_implementation(**kwargs)
                success = True
                return json.dumps(result) if not isinstance(result, str) else result
            elif self.spec.implementation:
                # Fall back to sync implementation in thread pool
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, self.spec.implementation, **kwargs)
                success = True
                return json.dumps(result) if not isinstance(result, str) else result
            else:
                raise NotImplementedError("No implementation provided")
        
        except Exception as e:
            logger.error(f"Tool {self.name} async execution failed: {e}")
            return f"Error: {str(e)}"
        
        finally:
            duration = (datetime.now() - start_time).total_seconds()
            input_size = len(json.dumps(kwargs))
            output_size = len(json.dumps(result)) if success and result else 0
            
            self.performance_monitor.record_execution(
                self.name, duration, success, input_size, output_size
            )


class InvestigationToolBuilder:
    """Builder for creating investigation-specific tools."""
    
    def __init__(self):
        """Initialize tool builder."""
        self.validator = ToolValidator()
        self.performance_monitor = PerformanceMonitor()
        self.registered_tools: Dict[str, InvestigationTool] = {}
        self.tool_templates: Dict[str, ToolSpecification] = self._load_templates()
    
    def _load_templates(self) -> Dict[str, ToolSpecification]:
        """Load pre-defined tool templates."""
        templates = {}
        
        # Device fingerprint analyzer template
        templates["device_analyzer"] = ToolSpecification(
            name="device_fingerprint_analyzer",
            description="Analyzes device fingerprints for fraud detection",
            category=ToolCategory.ANALYSIS,
            input_schema={
                "type": "object",
                "properties": {
                    "fingerprint": {"type": "string", "description": "Device fingerprint hash"},
                    "metadata": {"type": "object", "description": "Device metadata"}
                },
                "required": ["fingerprint"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "risk_score": {"type": "number"},
                    "anomalies": {"type": "array"},
                    "device_trust": {"type": "boolean"}
                }
            },
            performance_targets={"max_latency": 2.0, "min_success_rate": 0.95}
        )
        
        # Log pattern detector template
        templates["log_detector"] = ToolSpecification(
            name="log_pattern_detector",
            description="Detects suspicious patterns in log data",
            category=ToolCategory.ANALYSIS,
            input_schema={
                "type": "object",
                "properties": {
                    "logs": {"type": "array", "description": "Log entries to analyze"},
                    "pattern_type": {"type": "string", "description": "Type of pattern to detect"}
                },
                "required": ["logs"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "patterns_found": {"type": "array"},
                    "confidence": {"type": "number"},
                    "recommendations": {"type": "array"}
                }
            },
            performance_targets={"max_latency": 5.0, "min_success_rate": 0.90}
        )
        
        # Geolocation validator template
        templates["geo_validator"] = ToolSpecification(
            name="geolocation_validator",
            description="Validates geolocation data for consistency",
            category=ToolCategory.VALIDATION,
            input_schema={
                "type": "object",
                "properties": {
                    "ip": {"type": "string", "description": "IP address"},
                    "claimed_location": {"type": "object", "description": "Claimed location data"}
                },
                "required": ["ip"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "valid": {"type": "boolean"},
                    "actual_location": {"type": "object"},
                    "distance_km": {"type": "number"}
                }
            },
            performance_targets={"max_latency": 3.0, "min_success_rate": 0.98}
        )
        
        return templates
    
    def create_tool(self, spec: ToolSpecification) -> InvestigationTool:
        """Create a tool from specification."""
        # Validate specification
        spec_errors = self.validator.validate_specification(spec)
        if spec_errors:
            raise ValueError(f"Invalid tool specification: {', '.join(spec_errors)}")
        
        # Validate implementation if provided
        if spec.implementation or spec.async_implementation:
            impl_errors = self.validator.validate_implementation(spec)
            if impl_errors:
                raise ValueError(f"Invalid tool implementation: {', '.join(impl_errors)}")
        
        # Create tool instance
        tool = InvestigationTool(spec, self.performance_monitor)
        
        # Register tool
        self.registered_tools[spec.name] = tool
        logger.info(f"Created and registered tool: {spec.name}")
        
        return tool
    
    def create_from_template(self, template_name: str, 
                           implementation: Optional[Callable] = None,
                           async_implementation: Optional[Callable] = None) -> InvestigationTool:
        """Create a tool from a pre-defined template."""
        if template_name not in self.tool_templates:
            raise ValueError(f"Unknown template: {template_name}")
        
        # Clone template
        spec = self.tool_templates[template_name]
        spec.implementation = implementation
        spec.async_implementation = async_implementation
        
        return self.create_tool(spec)
    
    def create_from_function(self, func: Callable, 
                            name: Optional[str] = None,
                            description: Optional[str] = None,
                            category: ToolCategory = ToolCategory.ANALYSIS) -> InvestigationTool:
        """Create a tool from a Python function."""
        # Extract function metadata
        sig = inspect.signature(func)
        func_name = name or func.__name__
        func_description = description or func.__doc__ or "Custom investigation tool"
        
        # Build input schema from function signature
        input_schema = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        for param_name, param in sig.parameters.items():
            if param_name == "self":
                continue
            
            # Infer type from annotation
            param_type = "string"  # default
            if param.annotation != inspect.Parameter.empty:
                if param.annotation == int:
                    param_type = "integer"
                elif param.annotation == float:
                    param_type = "number"
                elif param.annotation == bool:
                    param_type = "boolean"
                elif param.annotation == list:
                    param_type = "array"
                elif param.annotation == dict:
                    param_type = "object"
            
            input_schema["properties"][param_name] = {
                "type": param_type,
                "description": f"Parameter {param_name}"
            }
            
            if param.default == inspect.Parameter.empty:
                input_schema["required"].append(param_name)
        
        # Create specification
        spec = ToolSpecification(
            name=func_name,
            description=func_description,
            category=category,
            input_schema=input_schema,
            output_schema={"type": "object"},  # Generic output
            implementation=func if not asyncio.iscoroutinefunction(func) else None,
            async_implementation=func if asyncio.iscoroutinefunction(func) else None
        )
        
        return self.create_tool(spec)
    
    def optimize_tool(self, tool_name: str) -> Dict[str, Any]:
        """Optimize tool based on performance metrics."""
        if tool_name not in self.registered_tools:
            raise ValueError(f"Tool not registered: {tool_name}")
        
        tool = self.registered_tools[tool_name]
        metrics = self.performance_monitor.get_metrics(tool_name)
        
        if not metrics:
            return {"status": "no_metrics", "tool": tool_name}
        
        optimizations = []
        
        # Check if caching would help
        if metrics["avg_duration"] > 1.0 and not tool.spec.cache_config:
            tool.spec.cache_config = {"ttl": 300, "max_size": 100}
            optimizations.append("Added caching for slow operations")
        
        # Check if retry config needed
        success_rate = metrics["successful_executions"] / metrics["total_executions"]
        if success_rate < 0.95 and not tool.spec.retry_config:
            tool.spec.retry_config = {"max_retries": 3, "backoff_factor": 1.5}
            optimizations.append("Added retry logic for reliability")
        
        # Check performance targets
        if tool.spec.performance_targets:
            target_results = self.performance_monitor.check_performance_targets(
                tool_name, tool.spec.performance_targets
            )
            
            if not all(target_results.values()):
                optimizations.append(f"Performance targets not met: {target_results}")
        
        return {
            "status": "optimized" if optimizations else "no_optimization_needed",
            "tool": tool_name,
            "optimizations": optimizations,
            "metrics": metrics
        }
    
    def get_tool_catalog(self) -> Dict[str, Dict[str, Any]]:
        """Get catalog of all registered tools."""
        catalog = {}
        
        for name, tool in self.registered_tools.items():
            metrics = self.performance_monitor.get_metrics(name)
            
            catalog[name] = {
                "description": tool.description,
                "category": tool.spec.category.value,
                "input_schema": tool.spec.input_schema,
                "output_schema": tool.spec.output_schema,
                "performance_targets": tool.spec.performance_targets,
                "metrics": metrics
            }
        
        return catalog


# Example tool implementations
def analyze_device_fingerprint(fingerprint: str, metadata: dict = None) -> dict:
    """Example implementation of device fingerprint analysis."""
    # Simulate analysis
    risk_score = 0.3
    anomalies = []
    
    if len(fingerprint) < 10:
        risk_score += 0.3
        anomalies.append("Short fingerprint")
    
    if metadata and "browser" in metadata:
        if "bot" in metadata["browser"].lower():
            risk_score += 0.4
            anomalies.append("Bot-like browser signature")
    
    return {
        "risk_score": min(risk_score, 1.0),
        "anomalies": anomalies,
        "device_trust": risk_score < 0.5
    }


async def detect_log_patterns(logs: list, pattern_type: str = "anomaly") -> dict:
    """Example async implementation of log pattern detection."""
    # Simulate async pattern detection
    await asyncio.sleep(0.1)  # Simulate processing time
    
    patterns_found = []
    confidence = 0.8
    
    for log in logs[:10]:  # Analyze first 10 logs
        if "error" in str(log).lower():
            patterns_found.append({"type": "error", "log": log})
        if "failed" in str(log).lower():
            patterns_found.append({"type": "failure", "log": log})
    
    recommendations = []
    if len(patterns_found) > 5:
        recommendations.append("High error rate detected - investigate immediately")
        confidence = 0.95
    
    return {
        "patterns_found": patterns_found,
        "confidence": confidence,
        "recommendations": recommendations
    }


# Example usage
def example_tool_creation():
    """Example of creating custom investigation tools."""
    builder = InvestigationToolBuilder()
    
    # Create tool from template with implementation
    device_tool = builder.create_from_template(
        "device_analyzer",
        implementation=analyze_device_fingerprint
    )
    
    # Create tool from function
    @builder.create_from_function
    def check_ip_reputation(ip: str, threshold: float = 0.5) -> dict:
        """Check IP address reputation score."""
        # Simulate IP check
        import random
        score = random.random()
        return {
            "ip": ip,
            "reputation_score": score,
            "is_suspicious": score > threshold
        }
    
    # Create tool from specification
    custom_spec = ToolSpecification(
        name="custom_validator",
        description="Custom validation tool",
        category=ToolCategory.VALIDATION,
        input_schema={
            "type": "object",
            "properties": {
                "data": {"type": "object"}
            },
            "required": ["data"]
        },
        output_schema={
            "type": "object",
            "properties": {
                "valid": {"type": "boolean"}
            }
        },
        implementation=lambda data: {"valid": bool(data)}
    )
    
    custom_tool = builder.create_tool(custom_spec)
    
    # Get tool catalog
    catalog = builder.get_tool_catalog()
    
    return builder, catalog


if __name__ == "__main__":
    # Create example tools
    builder, catalog = example_tool_creation()
    logger.info(f"Created {len(catalog)} tools")
    logger.info(f"Tool catalog: {json.dumps(catalog, indent=2)}")