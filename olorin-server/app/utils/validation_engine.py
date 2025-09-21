#!/usr/bin/env python3
"""
Validation Engine
Master orchestrator for all entity validation using specialized validation rules.
"""

from typing import Any, Dict, List, Optional, Set, Tuple, Union
from enum import Enum
from app.service.agent.multi_entity.entity_manager import EntityType
from app.utils.comprehensive_entity_validation import ComprehensiveEntityValidator
from app.utils.validation_rules.financial_rules import FinancialValidationRules
from app.utils.validation_rules.security_rules import SecurityValidationRules
from app.utils.validation_rules.geographic_rules import GeographicValidationRules
from app.utils.validation_rules.temporal_rules import TemporalValidationRules
from app.utils.validation_rules.network_rules import NetworkValidationRules


class ValidationSeverity(Enum):
    """Validation result severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ValidationResult:
    """Comprehensive validation result with detailed analysis"""
    
    def __init__(self, entity_type: EntityType, field_name: str, value: Any):
        self.entity_type = entity_type
        self.field_name = field_name
        self.value = value
        self.is_valid = True
        self.severity = ValidationSeverity.INFO
        self.error_message: Optional[str] = None
        self.warnings: List[str] = []
        self.security_analysis: Dict[str, Any] = {}
        self.financial_analysis: Dict[str, Any] = {}
        self.geographic_analysis: Dict[str, Any] = {}
        self.temporal_analysis: Dict[str, Any] = {}
        self.network_analysis: Dict[str, Any] = {}
        self.recommendations: List[str] = []
        self.risk_score: float = 0.0
    
    def add_error(self, message: str, severity: ValidationSeverity = ValidationSeverity.ERROR):
        """Add validation error"""
        self.is_valid = False
        self.error_message = message
        self.severity = severity
    
    def add_warning(self, message: str):
        """Add validation warning"""
        self.warnings.append(message)
    
    def add_recommendation(self, recommendation: str):
        """Add improvement recommendation"""
        self.recommendations.append(recommendation)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        return {
            'entity_type': self.entity_type.value,
            'field_name': self.field_name,
            'value': self.value,
            'is_valid': self.is_valid,
            'severity': self.severity.value,
            'error_message': self.error_message,
            'warnings': self.warnings,
            'risk_score': self.risk_score,
            'analysis': {
                'security': self.security_analysis,
                'financial': self.financial_analysis,
                'geographic': self.geographic_analysis,
                'temporal': self.temporal_analysis,
                'network': self.network_analysis
            },
            'recommendations': self.recommendations
        }


class ValidationEngine:
    """
    Master validation engine that orchestrates all validation rules
    """
    
    def __init__(self):
        """Initialize validation engine with all specialized validators"""
        self.comprehensive_validator = ComprehensiveEntityValidator()
        self.financial_validator = FinancialValidationRules()
        self.security_validator = SecurityValidationRules()
        self.geographic_validator = GeographicValidationRules()
        self.temporal_validator = TemporalValidationRules()
        self.network_validator = NetworkValidationRules()
        
        # Entity type mapping to specialized validators
        self.entity_validator_mapping = self._build_entity_validator_mapping()
    
    def validate_entity(self, entity_type: EntityType, field_name: str, value: Any, 
                       context: Optional[Dict[str, Any]] = None) -> ValidationResult:
        """
        Comprehensive entity validation using all applicable rules.
        
        Args:
            entity_type: The entity type being validated
            field_name: The field name within the entity
            value: The value to validate
            context: Optional context for cross-field validation
            
        Returns:
            ValidationResult with comprehensive analysis
        """
        result = ValidationResult(entity_type, field_name, value)
        
        try:
            # Step 1: Basic comprehensive validation
            is_valid, error_msg = self.comprehensive_validator.validate_entity(entity_type, field_name, value)
            if not is_valid:
                result.add_error(error_msg, ValidationSeverity.ERROR)
                return result
            
            # Step 2: Apply specialized validation rules based on entity type
            self._apply_specialized_validation(result, context)
            
            # Step 3: Calculate overall risk score
            result.risk_score = self._calculate_risk_score(result)
            
            # Step 4: Generate recommendations
            result.recommendations = self._generate_recommendations(result)
            
            return result
            
        except Exception as e:
            result.add_error(f"Validation engine error: {str(e)}", ValidationSeverity.CRITICAL)
            return result
    
    def validate_entity_batch(self, entity_data: Dict[EntityType, Dict[str, Any]], 
                            context: Optional[Dict[str, Any]] = None) -> Dict[str, ValidationResult]:
        """
        Validate multiple entities in batch with cross-validation.
        
        Args:
            entity_data: Dictionary mapping entity types to their field data
            context: Optional context for cross-field validation
            
        Returns:
            Dictionary of validation results keyed by "entity_type.field_name"
        """
        results = {}
        
        # Individual entity validation
        for entity_type, fields in entity_data.items():
            for field_name, value in fields.items():
                key = f"{entity_type.value}.{field_name}"
                results[key] = self.validate_entity(entity_type, field_name, value, context)
        
        # Cross-entity validation
        self._apply_cross_entity_validation(results, entity_data, context)
        
        return results
    
    def validate_transaction_data(self, transaction_data: Dict[str, Any]) -> Dict[str, ValidationResult]:
        """
        Specialized validation for complete transaction data.
        
        Args:
            transaction_data: Complete transaction data dictionary
            
        Returns:
            Dictionary of validation results with transaction-specific analysis
        """
        results = {}
        
        # Map transaction fields to entity types
        entity_mapping = self._map_transaction_to_entities(transaction_data)
        
        # Validate each mapped entity
        for entity_type, fields in entity_mapping.items():
            for field_name, value in fields.items():
                key = f"{entity_type.value}.{field_name}"
                result = self.validate_entity(entity_type, field_name, value, transaction_data)
                
                # Add transaction-specific analysis
                self._add_transaction_analysis(result, transaction_data)
                
                results[key] = result
        
        return results
    
    def _build_entity_validator_mapping(self) -> Dict[EntityType, List[str]]:
        """Build mapping of entity types to applicable specialized validators"""
        return {
            # Financial entities
            EntityType.AMOUNT: ['financial', 'security'],
            EntityType.CURRENCY: ['financial'],
            EntityType.TX_CURRENCY: ['financial'],
            EntityType.PAYMENT_METHOD: ['financial', 'security'],
            EntityType.CARD_BIN: ['financial', 'security'],
            EntityType.CARD_LAST_FOUR: ['financial'],
            
            # Geographic entities
            EntityType.COUNTRY_CODE: ['geographic'],
            EntityType.POSTAL_CODE: ['geographic'],
            EntityType.LATITUDE: ['geographic'],
            EntityType.LONGITUDE: ['geographic'],
            EntityType.IP_COUNTRY: ['geographic', 'network'],
            
            # Temporal entities
            EntityType.TX_TIMESTAMP: ['temporal'],
            EntityType.TX_TIMESTAMP_MS: ['temporal'],
            EntityType.CREATED_AT: ['temporal'],
            EntityType.UPDATED_AT: ['temporal'],
            
            # Network entities
            EntityType.IP: ['network', 'security'],
            EntityType.CLIENT_IP: ['network', 'security'],
            EntityType.USER_AGENT: ['network', 'security'],
            EntityType.DEVICE_ID: ['network', 'security'],
            
            # Security entities
            EntityType.EMAIL: ['security'],
            EntityType.BUYER_EMAIL: ['security'],
            EntityType.PASSWORD_HASH: ['security'],
            EntityType.JWT_TOKEN: ['security'],
        }
    
    def _apply_specialized_validation(self, result: ValidationResult, context: Optional[Dict[str, Any]]):
        """Apply specialized validation rules based on entity type"""
        entity_type = result.entity_type
        field_name = result.field_name
        value = result.value
        
        # Get applicable validators for this entity type
        applicable_validators = self.entity_validator_mapping.get(entity_type, [])
        
        # Financial validation
        if 'financial' in applicable_validators:
            self._apply_financial_validation(result, context)
        
        # Security validation
        if 'security' in applicable_validators:
            self._apply_security_validation(result, context)
        
        # Geographic validation
        if 'geographic' in applicable_validators:
            self._apply_geographic_validation(result, context)
        
        # Temporal validation
        if 'temporal' in applicable_validators:
            self._apply_temporal_validation(result, context)
        
        # Network validation
        if 'network' in applicable_validators:
            self._apply_network_validation(result, context)
    
    def _apply_financial_validation(self, result: ValidationResult, context: Optional[Dict[str, Any]]):
        """Apply financial validation rules"""
        entity_type = result.entity_type
        field_name = result.field_name
        value = result.value
        
        if entity_type in [EntityType.AMOUNT, EntityType.TX_AMOUNT]:
            currency = context.get('currency', 'USD') if context else 'USD'
            is_valid, error_msg = self.financial_validator.validate_currency_amount(value, currency)
            if not is_valid:
                result.add_error(f"Financial validation failed: {error_msg}")
            
        elif entity_type == EntityType.PAYMENT_METHOD:
            payment_data = context.get('payment_data', {}) if context else {}
            is_valid, error_msg = self.financial_validator.validate_payment_method(str(value), payment_data)
            if not is_valid:
                result.add_error(f"Payment method validation failed: {error_msg}")
        
        # Add transaction risk analysis if context available
        if context:
            try:
                is_safe, risk_msg, risk_analysis = self.financial_validator.validate_transaction_risk(context)
                result.financial_analysis = risk_analysis
                if not is_safe:
                    result.add_warning(risk_msg)
            except Exception:
                pass  # Skip if context doesn't have required fields
    
    def _apply_security_validation(self, result: ValidationResult, context: Optional[Dict[str, Any]]):
        """Apply security validation rules"""
        field_name = result.field_name
        value = result.value
        
        # Input security validation
        is_safe, error_msg, security_analysis = self.security_validator.validate_input_security(str(value), field_name)
        result.security_analysis = security_analysis
        
        if not is_safe:
            result.add_error(f"Security validation failed: {error_msg}", ValidationSeverity.CRITICAL)
        
        # Fraud indicators if context available
        if context:
            try:
                is_legit, fraud_msg, fraud_analysis = self.security_validator.validate_fraud_indicators(context)
                result.security_analysis.update({'fraud_analysis': fraud_analysis})
                if not is_legit:
                    result.add_warning(f"Fraud indicators: {fraud_msg}")
            except Exception:
                pass
    
    def _apply_geographic_validation(self, result: ValidationResult, context: Optional[Dict[str, Any]]):
        """Apply geographic validation rules"""
        entity_type = result.entity_type
        value = result.value
        
        if entity_type == EntityType.COUNTRY_CODE:
            is_valid, error_msg, geo_analysis = self.geographic_validator.validate_country_code(str(value))
            result.geographic_analysis = geo_analysis
            if not is_valid:
                result.add_error(f"Geographic validation failed: {error_msg}")
        
        elif entity_type in [EntityType.LATITUDE, EntityType.LONGITUDE] and context:
            lat = context.get('latitude')
            lon = context.get('longitude')
            if lat is not None and lon is not None:
                is_valid, error_msg, coord_analysis = self.geographic_validator.validate_coordinates(float(lat), float(lon))
                result.geographic_analysis = coord_analysis
                if not is_valid:
                    result.add_error(f"Coordinate validation failed: {error_msg}")
    
    def _apply_temporal_validation(self, result: ValidationResult, context: Optional[Dict[str, Any]]):
        """Apply temporal validation rules"""
        entity_type = result.entity_type
        value = result.value
        
        if 'timestamp' in entity_type.value.lower() or 'time' in entity_type.value.lower():
            is_valid, error_msg, temporal_analysis = self.temporal_validator.validate_timestamp(value)
            result.temporal_analysis = temporal_analysis
            if not is_valid:
                result.add_error(f"Temporal validation failed: {error_msg}")
            
            # Business hours validation if context available
            if context:
                try:
                    is_business, business_msg, business_analysis = self.temporal_validator.validate_business_hours(value)
                    result.temporal_analysis.update({'business_analysis': business_analysis})
                    if not is_business:
                        result.add_warning(f"Business hours: {business_msg}")
                except Exception:
                    pass
    
    def _apply_network_validation(self, result: ValidationResult, context: Optional[Dict[str, Any]]):
        """Apply network validation rules"""
        entity_type = result.entity_type
        value = result.value
        
        if entity_type in [EntityType.IP, EntityType.CLIENT_IP]:
            is_valid, error_msg, network_analysis = self.network_validator.validate_ip_address(str(value))
            result.network_analysis = network_analysis
            if not is_valid:
                result.add_error(f"Network validation failed: {error_msg}")
        
        elif entity_type == EntityType.USER_AGENT:
            is_valid, error_msg, ua_analysis = self.network_validator.validate_user_agent(str(value))
            result.network_analysis = ua_analysis
            if not is_valid:
                result.add_warning(f"User agent analysis: {error_msg}")
    
    def _apply_cross_entity_validation(self, results: Dict[str, ValidationResult], 
                                     entity_data: Dict[EntityType, Dict[str, Any]], 
                                     context: Optional[Dict[str, Any]]):
        """Apply cross-entity validation rules"""
        # Example: Validate geographic consistency
        country_result = None
        coord_results = []
        
        for key, result in results.items():
            if result.entity_type == EntityType.COUNTRY_CODE:
                country_result = result
            elif result.entity_type in [EntityType.LATITUDE, EntityType.LONGITUDE]:
                coord_results.append(result)
        
        # If we have both country and coordinates, validate consistency
        if country_result and len(coord_results) >= 2:
            # This would perform geographic consistency validation
            pass
    
    def _map_transaction_to_entities(self, transaction_data: Dict[str, Any]) -> Dict[EntityType, Dict[str, Any]]:
        """Map transaction fields to appropriate entity types"""
        entity_mapping = {}
        
        # Common field mappings
        field_entity_map = {
            'amount': EntityType.AMOUNT,
            'currency': EntityType.CURRENCY,
            'email': EntityType.EMAIL,
            'ip': EntityType.IP,
            'user_agent': EntityType.USER_AGENT,
            'country_code': EntityType.COUNTRY_CODE,
            'payment_method': EntityType.PAYMENT_METHOD,
            'transaction_id': EntityType.TRANSACTION_ID,
            'timestamp': EntityType.TX_TIMESTAMP,
        }
        
        for field_name, value in transaction_data.items():
            if field_name in field_entity_map:
                entity_type = field_entity_map[field_name]
                if entity_type not in entity_mapping:
                    entity_mapping[entity_type] = {}
                entity_mapping[entity_type][field_name] = value
        
        return entity_mapping
    
    def _add_transaction_analysis(self, result: ValidationResult, transaction_data: Dict[str, Any]):
        """Add transaction-specific analysis to validation result"""
        # This could include transaction pattern analysis, velocity checks, etc.
        pass
    
    def _calculate_risk_score(self, result: ValidationResult) -> float:
        """Calculate overall risk score from all analyses"""
        risk_factors = []
        
        # Collect risk scores from different analyses
        if result.security_analysis.get('threat_score'):
            risk_factors.append(result.security_analysis['threat_score'])
        
        if result.financial_analysis.get('risk_score'):
            risk_factors.append(result.financial_analysis['risk_score'])
        
        if result.geographic_analysis.get('risk_score'):
            risk_factors.append(result.geographic_analysis.get('risk_score', 0))
        
        if result.network_analysis.get('risk_score'):
            risk_factors.append(result.network_analysis['risk_score'])
        
        # Calculate weighted average
        if risk_factors:
            return min(sum(risk_factors) / len(risk_factors), 1.0)
        
        return 0.0
    
    def _generate_recommendations(self, result: ValidationResult) -> List[str]:
        """Generate improvement recommendations based on validation results"""
        recommendations = []
        
        if result.risk_score > 0.7:
            recommendations.append("High risk detected - requires manual review")
        elif result.risk_score > 0.5:
            recommendations.append("Moderate risk - additional verification recommended")
        
        if result.warnings:
            recommendations.append("Address validation warnings for improved security")
        
        if result.security_analysis.get('threats'):
            recommendations.append("Implement additional security measures")
        
        return recommendations


# Global validation engine instance
_validation_engine: Optional[ValidationEngine] = None


def get_validation_engine() -> ValidationEngine:
    """Get the global validation engine instance"""
    global _validation_engine
    
    if _validation_engine is None:
        _validation_engine = ValidationEngine()
    
    return _validation_engine


def validate_entity_field(entity_type: EntityType, field_name: str, value: Any, 
                         context: Optional[Dict[str, Any]] = None) -> ValidationResult:
    """
    Convenience function to validate a single entity field.
    
    Args:
        entity_type: The entity type being validated
        field_name: The field name within the entity
        value: The value to validate
        context: Optional context for cross-field validation
        
    Returns:
        ValidationResult with comprehensive analysis
    """
    engine = get_validation_engine()
    return engine.validate_entity(entity_type, field_name, value, context)


def validate_transaction(transaction_data: Dict[str, Any]) -> Dict[str, ValidationResult]:
    """
    Convenience function to validate complete transaction data.
    
    Args:
        transaction_data: Complete transaction data dictionary
        
    Returns:
        Dictionary of validation results with transaction-specific analysis
    """
    engine = get_validation_engine()
    return engine.validate_transaction_data(transaction_data)